import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserRole } from "@mivitrina/shared";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Injecte l'utilisateur authentifié (posé par JwtAccessStrategy) dans un handler. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
