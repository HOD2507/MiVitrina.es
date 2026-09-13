import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { GeocodingModule } from "../geocoding/geocoding.module";

@Module({
  imports: [
    PassportModule,
    // Pas de config par défaut : chaque signature (access/refresh/email)
    // précise explicitement son secret et sa durée de vie (voir AuthService).
    JwtModule.register({}),
    GeocodingModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    // Guards globaux : toute route est protégée par défaut (voir @Public()),
    // et RolesGuard applique les restrictions @Roles(...) le cas échéant.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
