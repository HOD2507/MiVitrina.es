import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { BUSINESS_ID_TYPE_BY_COUNTRY, Country, Locale, UserRole } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { GeocodingService } from "../geocoding/geocoding.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { EMAIL_VERIFY_TOKEN_TTL, PASSWORD_RESET_TOKEN_TTL, asJwtExpiry } from "./auth.constants";
import type { AccessTokenPayload, EmailActionTokenPayload, RefreshTokenPayload } from "./types/jwt-payload.interface";

const BCRYPT_SALT_ROUNDS = 12;

/** Langue par défaut déduite du pays si l'utilisateur n'en précise pas. */
const DEFAULT_LOCALE_BY_COUNTRY: Record<Country, Locale> = {
  [Country.FR]: Locale.FR,
  [Country.ES]: Locale.ES,
};

/** Nom complet du pays, plus fiable que le code ISO pour le géocodage Nominatim. */
const COUNTRY_NAME_FOR_GEOCODING: Record<Country, string> = {
  [Country.FR]: "France",
  [Country.ES]: "España",
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly geocoding: GeocodingService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Un compte existe déjà avec cet email.");
    }

    if (dto.role === UserRole.COMMERCANT) {
      const existingBusiness = await this.prisma.commercantProfile.findUnique({
        where: { country_businessIdNumber: { country: dto.country, businessIdNumber: dto.businessIdNumber! } },
      });
      if (existingBusiness) {
        throw new ConflictException("Un commerce est déjà enregistré avec ce numéro SIRET/NIF-CIF.");
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const locale = dto.locale ?? DEFAULT_LOCALE_BY_COUNTRY[dto.country];

    // Géocodage AVANT la transaction : c'est un appel réseau externe, il
    // ne doit jamais rester dans une transaction DB ouverte. Un échec ne
    // bloque pas l'inscription — le commerce reste juste invisible dans
    // la recherche tant que ses coordonnées ne sont pas connues (voir
    // GeocodingService).
    let coordinates: { latitude: number; longitude: number } | null = null;
    if (dto.role === UserRole.COMMERCANT) {
      const fullAddress = [dto.addressLine1, dto.postalCode, dto.city, COUNTRY_NAME_FOR_GEOCODING[dto.country]]
        .filter(Boolean)
        .join(", ");
      coordinates = await this.geocoding.geocode(fullAddress);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
          locale,
        },
      });

      if (dto.role === UserRole.COMMERCANT) {
        await tx.commercantProfile.create({
          data: {
            userId: created.id,
            businessName: dto.businessName!,
            country: dto.country,
            businessIdType: BUSINESS_ID_TYPE_BY_COUNTRY[dto.country],
            businessIdNumber: dto.businessIdNumber!,
            addressLine1: dto.addressLine1!,
            addressLine2: dto.addressLine2,
            city: dto.city!,
            postalCode: dto.postalCode!,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
          },
        });
      } else {
        await tx.annonceurProfile.create({
          data: {
            userId: created.id,
            country: dto.country,
            companyName: dto.companyName,
          },
        });
      }

      return created;
    });

    await this.sendVerificationEmail(user.id, user.email, locale);

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.tokenVersion);
    return { user: this.toSafeUser(user), tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    if (user.suspended) {
      throw new UnauthorizedException("Ce compte a été suspendu. Contactez le support.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.tokenVersion);
    return { user: this.toSafeUser(user), tokens };
  }

  /** Émet un nouveau couple de tokens à partir d'un refresh token valide (voir JwtRefreshStrategy). */
  async refresh(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.issueTokens(user.id, user.email, user.role, user.tokenVersion);
  }

  /** Invalide tous les refresh tokens en circulation pour cet utilisateur. */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async verifyEmail(token: string) {
    const payload = this.verifyEmailActionToken(token, "email-verify");

    // Contrairement au reset de mot de passe, on ne vérifie pas
    // tokenVersion ici : un logout entre-temps ne doit pas invalider un
    // lien de confirmation d'email encore valide (action inoffensive et idempotente).
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new BadRequestException("Lien de vérification invalide ou expiré.");
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  }

  /** Ne révèle jamais si l'email existe ou non (anti-énumération de comptes). */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = this.jwt.sign(
      { sub: user.id, purpose: "password-reset", tokenVersion: user.tokenVersion } satisfies EmailActionTokenPayload,
      { secret: this.config.get<string>("EMAIL_TOKEN_SECRET"), expiresIn: asJwtExpiry(PASSWORD_RESET_TOKEN_TTL) },
    );

    const resetUrl = `${this.config.get<string>("WEB_APP_URL")}/${user.locale.toLowerCase()}/reset-password?token=${token}`;
    await this.mail.send({
      to: user.email,
      subject: "Réinitialisation de votre mot de passe MiVitrina",
      html: `<p>Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 1h) :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const payload = this.verifyEmailActionToken(token, "password-reset");

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new BadRequestException("Lien de réinitialisation invalide ou expiré.");
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      // Le changement de mot de passe invalide toutes les sessions en cours.
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { commercantProfile: true, annonceurProfile: true },
    });
    return this.toSafeUser(user);
  }

  // ---------------------------------------------------------------------
  // Helpers internes
  // ---------------------------------------------------------------------

  private async sendVerificationEmail(userId: string, email: string, locale: Locale) {
    // tokenVersion n'est pas utilisé pour ce purpose (voir verifyEmail) :
    // seul le reset de mot de passe s'en sert pour invalider les liens
    // périmés. La valeur ici est un simple placeholder de type.
    const token = this.jwt.sign(
      { sub: userId, purpose: "email-verify", tokenVersion: 0 } satisfies EmailActionTokenPayload,
      { secret: this.config.get<string>("EMAIL_TOKEN_SECRET"), expiresIn: asJwtExpiry(EMAIL_VERIFY_TOKEN_TTL) },
    );

    const verifyUrl = `${this.config.get<string>("WEB_APP_URL")}/${locale.toLowerCase()}/verify-email?token=${token}`;
    await this.mail.send({
      to: email,
      subject: "Confirmez votre adresse email — MiVitrina",
      html: `<p>Bienvenue sur MiVitrina ! Confirmez votre email en cliquant ici :</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
  }

  private verifyEmailActionToken(token: string, expectedPurpose: EmailActionTokenPayload["purpose"]) {
    let payload: EmailActionTokenPayload;
    try {
      payload = this.jwt.verify<EmailActionTokenPayload>(token, {
        secret: this.config.get<string>("EMAIL_TOKEN_SECRET"),
      });
    } catch {
      throw new BadRequestException("Lien invalide ou expiré.");
    }

    if (payload.purpose !== expectedPurpose) {
      throw new BadRequestException("Lien invalide.");
    }

    return payload;
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: UserRole,
    tokenVersion: number,
  ): Promise<AuthTokens> {
    const accessToken = this.jwt.sign({ sub: userId, email, role } satisfies AccessTokenPayload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: asJwtExpiry(this.config.get<string>("JWT_ACCESS_EXPIRES_IN")!),
    });

    const refreshToken = this.jwt.sign({ sub: userId, tokenVersion } satisfies RefreshTokenPayload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: asJwtExpiry(this.config.get<string>("JWT_REFRESH_EXPIRES_IN")!),
    });

    return { accessToken, refreshToken };
  }

  private toSafeUser<T extends { passwordHash: string; tokenVersion: number }>(user: T) {
    const { passwordHash, tokenVersion, ...safe } = user;
    return safe;
  }
}
