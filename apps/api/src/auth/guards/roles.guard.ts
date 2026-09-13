import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@mivitrina/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Guard global (voir AuthModule) : sans @Roles(...) sur une route,
 * n'importe quel utilisateur authentifié peut y accéder. Avec
 * @Roles(...), seuls les rôles listés passent.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Accès réservé à un autre type de compte.");
    }

    return true;
  }
}
