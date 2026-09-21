import { AdminLevel, AdminPermission, hasAdminPermission } from "@mivitrina/shared";

/** Quién puede abrir la bandeja de soporte (permiso support.manage, ver shared/ADMIN_PERMISSIONS). */
describe("permiso support.manage", () => {
  it("lo tienen SUPERADMIN y SUPPORT", () => {
    expect(hasAdminPermission(AdminLevel.SUPERADMIN, AdminPermission.SUPPORT_MANAGE)).toBe(true);
    expect(hasAdminPermission(AdminLevel.SUPPORT, AdminPermission.SUPPORT_MANAGE)).toBe(true);
  });

  it("FINANCE no (su ámbito es dinero) y un usuario sin nivel tampoco", () => {
    expect(hasAdminPermission(AdminLevel.FINANCE, AdminPermission.SUPPORT_MANAGE)).toBe(false);
    expect(hasAdminPermission(null, AdminPermission.SUPPORT_MANAGE)).toBe(false);
  });
});
