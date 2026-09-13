import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import type { AccessTokenPayload } from "../types/jwt-payload.interface";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt-access") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([(req: Request) => req?.cookies?.["access_token"] ?? null]),
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET")!,
      ignoreExpiration: false,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.suspended) {
      throw new UnauthorizedException("Session invalide.");
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
