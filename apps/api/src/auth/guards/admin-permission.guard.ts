import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminPermission, hasAdminPermission } from "@mivitrina/shared";
import { ADMIN_PERMISSION_KEY } from "../decorators/admin-permission.decorator";

/**
 * Guard global (voir AuthModule) : sans @RequireAdminPermission(...) sur une
 * route, ce guard ne fait rien (le contrôle "faut-il être ADMIN" reste à la
 * charge de RolesGuard/@Roles). Avec le décorateur, vérifie que le
 * `adminLevel` du compte connecté couvre bien la permission demandée —
 * appliqué côté backend, jamais seulement en cachant un bouton côté front.
 */
@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<AdminPermission | undefined>(ADMIN_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!hasAdminPermission(user?.adminLevel, requiredPermission)) {
      throw new ForbiddenException("Votre niveau d'accès admin ne permet pas cette action.");
    }

    return true;
  }
}
