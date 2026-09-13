import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@mivitrina/shared";

/**
 * Restreint une route à un ou plusieurs rôles. Sans ce décorateur,
 * toute route protégée par JwtAuthGuard est accessible à n'importe
 * quel utilisateur authentifié (voir RolesGuard).
 */
export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
