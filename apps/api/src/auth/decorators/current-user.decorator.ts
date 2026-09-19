import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AdminLevel, UserRole } from "@mivitrina/shared";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  /** Non-null uniquement quand role === ADMIN. Voir AdminPermissionGuard. */
  adminLevel: AdminLevel | null;
}

/** Injecte l'utilisateur authentifié (posé par JwtAccessStrategy) dans un handler. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
