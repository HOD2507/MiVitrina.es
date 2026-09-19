import { SetMetadata } from "@nestjs/common";
import { AdminPermission } from "@mivitrina/shared";

/**
 * Restreint une route admin à un ou plusieurs sous-niveaux (voir AdminLevel).
 * S'ajoute à @Roles(UserRole.ADMIN), qui reste nécessaire : ce décorateur ne
 * vérifie que le périmètre à l'intérieur du rôle ADMIN, pas l'authentification
 * ni le rôle lui-même (voir AdminPermissionGuard).
 */
export const ADMIN_PERMISSION_KEY = "adminPermission";
export const RequireAdminPermission = (permission: AdminPermission) => SetMetadata(ADMIN_PERMISSION_KEY, permission);
