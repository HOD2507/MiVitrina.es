import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { UserRole } from "@mivitrina/shared";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { StorageService } from "../storage/storage.service";
import { GeocodingService } from "../geocoding/geocoding.service";
import { RegisterDto } from "./dto/register.dto";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findUniqueOrThrow: jest.Mock };
    commercantProfile: { create: jest.Mock; findUnique: jest.Mock };
    annonceurProfile: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let mail: { send: jest.Mock };
  let geocoding: { geocode: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      commercantProfile: { create: jest.fn(), findUnique: jest.fn().mockResolvedValue(null) },
      annonceurProfile: { create: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };
    mail = { send: jest.fn() };
    // Pas d'appel réseau Nominatim dans les tests unitaires : le géocodage
    // est testé séparément (voir GeocodingService), ici on le neutralise.
    geocoding = { geocode: jest.fn().mockResolvedValue(null) };

    const jwt = new JwtService();
    const config = new ConfigService({
      JWT_ACCESS_SECRET: "test-access",
      JWT_REFRESH_SECRET: "test-refresh",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "30d",
      EMAIL_TOKEN_SECRET: "test-email-token",
      WEB_APP_URL: "http://localhost:3000",
    });

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt,
      config,
      mail as unknown as MailService,
      geocoding as unknown as GeocodingService,
      {} as unknown as StorageService, // aucun test actuel ne touche à l'avatar
    );
  });

  describe("register", () => {
    const baseDto: RegisterDto = {
      email: "annonceur@example.com",
      password: "MotDePasse123",
      role: UserRole.ANNONCEUR,
      country: "FR",
    } as RegisterDto;

    it("refuse un email déjà utilisé", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing" });

      await expect(service.register(baseDto)).rejects.toBeInstanceOf(ConflictException);
    });

    it("crée un annonceur avec un mot de passe hashé et émet des tokens", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "user-1",
        email: baseDto.email,
        role: UserRole.ANNONCEUR,
        tokenVersion: 0,
        passwordHash: "irrelevant",
      });
      prisma.annonceurProfile.create.mockResolvedValue({});

      const { user, tokens } = await service.register(baseDto);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: baseDto.email, role: UserRole.ANNONCEUR }),
        }),
      );
      // Le mot de passe en clair ne doit jamais être stocké tel quel.
      const createdPasswordHash = prisma.user.create.mock.calls[0][0].data.passwordHash;
      expect(createdPasswordHash).not.toBe(baseDto.password);
      expect(await bcrypt.compare(baseDto.password, createdPasswordHash)).toBe(true);

      expect(user).not.toHaveProperty("passwordHash");
      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toEqual(expect.any(String));
      expect(mail.send).toHaveBeenCalledTimes(1);
    });

    it("crée le profil commerçant avec le businessIdType dérivé du pays", async () => {
      const commercantDto: RegisterDto = {
        ...baseDto,
        role: UserRole.COMMERCANT,
        country: "ES",
        businessName: "Tienda",
        businessIdNumber: "X1234567L",
        addressLine1: "Calle Mayor 1",
        city: "Madrid",
        postalCode: "28001",
      } as RegisterDto;

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "user-2",
        email: commercantDto.email,
        role: UserRole.COMMERCANT,
        tokenVersion: 0,
        passwordHash: "irrelevant",
      });
      prisma.commercantProfile.create.mockResolvedValue({});

      await service.register(commercantDto);

      expect(prisma.commercantProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ businessIdType: "NIF_CIF", country: "ES" }),
        }),
      );
    });
  });

  describe("login", () => {
    it("refuse un mot de passe incorrect", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "a@example.com",
        passwordHash: await bcrypt.hash("bonMotDePasse", 12),
        suspended: false,
      });

      await expect(service.login({ email: "a@example.com", password: "mauvais" })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("refuse un compte suspendu même avec le bon mot de passe", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "a@example.com",
        passwordHash: await bcrypt.hash("bonMotDePasse", 12),
        suspended: true,
      });

      await expect(service.login({ email: "a@example.com", password: "bonMotDePasse" })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
