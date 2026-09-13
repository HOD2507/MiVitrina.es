import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Utilisé uniquement sur POST /api/auth/refresh, vérifie le cookie `refresh_token`. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard("jwt-refresh") {}
