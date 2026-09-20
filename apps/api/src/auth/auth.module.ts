import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AdminPermissionGuard } from "./guards/admin-permission.guard";
import { AuthUserCacheService } from "./auth-user-cache.service";
import { GeocodingModule } from "../geocoding/geocoding.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [
    PassportModule,
    // Pas de config par défaut : chaque signature (access/refresh/email)
    // précise explicitement son secret et sa durée de vie (voir AuthService).
    JwtModule.register({}),
    GeocodingModule,
    StorageModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    AuthUserCacheService,
    // Guards globaux : toute route est protégée par défaut (voir @Public()),
    // RolesGuard applique les restrictions @Roles(...), puis AdminPermissionGuard
    // affine le périmètre à l'intérieur du rôle ADMIN (voir @RequireAdminPermission).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AdminPermissionGuard },
  ],
  // Exporté pour que les services qui mutent role/suspended/adminLevel
  // (ex: AdminService) puissent invalider une entrée immédiatement plutôt
  // que d'attendre le TTL — voir AuthUserCacheService.
  exports: [AuthUserCacheService],
})
export class AuthModule {}
