import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import type { RefreshTokenPayload } from "../types/jwt-payload.interface";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([(req: Request) => req?.cookies?.["refresh_token"] ?? null]),
      secretOrKey: config.get<string>("JWT_REFRESH_SECRET")!,
      ignoreExpiration: false,
    });
  }

  async validate(payload: RefreshTokenPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    // tokenVersion doit correspondre : un logout ou changement de mot de
    // passe incrémente ce compteur et invalide tous les refresh tokens émis avant.
    if (!user || user.suspended || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException("Session expirée, merci de vous reconnecter.");
    }

    return { id: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion };
  }
}
