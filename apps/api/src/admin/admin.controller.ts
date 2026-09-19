import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { AdminPermission, DisputeStatus, UserRole } from "@mivitrina/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireAdminPermission } from "../auth/decorators/admin-permission.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { AdminService } from "./admin.service";
import { ReviewVerificationDto } from "./dto/review-verification.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { ResolveDisputeDto } from "./dto/resolve-dispute.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { SuspendUserDto } from "./dto/suspend-user.dto";
import { ListReservationsQueryDto } from "./dto/list-reservations-query.dto";
import { ForceRefundDto } from "./dto/force-refund.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminLevelDto } from "./dto/update-admin-level.dto";
import { ListAuditLogQueryDto } from "./dto/list-audit-log-query.dto";

/**
 * Protégé au niveau backend (pas seulement en cachant le lien côté front) —
 * `@Roles(ADMIN)` filtre le rôle, `@RequireAdminPermission(...)` affine
 * ensuite le périmètre selon le sous-niveau (voir AdminPermissionGuard).
 * `GET /admin/stats` reste volontairement sans permission dédiée : vue
 * d'ensemble informative, accessible à n'importe quel niveau admin.
 */
@Controller("admin")
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("stats")
  getStats() {
    return this.admin.getStats();
  }

  /**
   * Réservé à ADMINS_MANAGE (donc SUPERADMIN uniquement, voir
   * ADMIN_PERMISSIONS) : le journal sert notamment à surveiller les actions
   * des admins SUPPORT/FINANCE, ils ne doivent donc pas pouvoir le lire
   * eux-mêmes. Aucune route PATCH/DELETE n'existe sur ce contrôleur pour
   * l'audit log — lecture seule, y compris pour un SUPERADMIN.
   */
  @Get("audit-log")
  @RequireAdminPermission(AdminPermission.ADMINS_MANAGE)
  listAuditLog(@Query() query: ListAuditLogQueryDto) {
    return this.admin.listAuditLog(query);
  }

  // --- Utilisateurs ---

  @Get("users")
  @RequireAdminPermission(AdminPermission.USERS_VIEW)
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get("users/:id")
  @RequireAdminPermission(AdminPermission.USERS_VIEW)
  getUserDetail(@Param("id") id: string) {
    return this.admin.getUserDetail(id);
  }

  @Patch("users/:id/suspend")
  @RequireAdminPermission(AdminPermission.USERS_SUSPEND)
  suspendUser(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: SuspendUserDto) {
    return this.admin.suspendUser(user.id, id, dto);
  }

  @Delete("users/:id")
  @RequireAdminPermission(AdminPermission.USERS_DELETE)
  deleteUser(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.deleteUser(user.id, id);
  }

  // --- Vérifications d'identité ---

  @Get("commercants/pending-verification")
  @RequireAdminPermission(AdminPermission.USERS_VERIFY)
  listPendingVerifications() {
    return this.admin.listPendingVerifications();
  }

  @Patch("commercants/:id/verification")
  @RequireAdminPermission(AdminPermission.USERS_VERIFY)
  reviewVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.admin.reviewVerification(user.id, id, dto);
  }

  // --- Réservations / transactions ---

  @Get("reservations")
  @RequireAdminPermission(AdminPermission.FINANCE_VIEW)
  listReservations(@Query() query: ListReservationsQueryDto) {
    return this.admin.listReservations(query);
  }

  @Get("reservations/:id")
  @RequireAdminPermission(AdminPermission.FINANCE_VIEW)
  getReservationDetail(@Param("id") id: string) {
    return this.admin.getReservationDetail(id);
  }

  @Post("reservations/:id/refund")
  @RequireAdminPermission(AdminPermission.FINANCE_REFUND)
  forceRefund(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ForceRefundDto) {
    return this.admin.forceRefund(user.id, id, dto);
  }

  // --- Réglages plateforme ---

  @Get("settings")
  @RequireAdminPermission(AdminPermission.SETTINGS_MANAGE)
  getSettings() {
    return this.admin.getSettings();
  }

  @Patch("settings")
  @RequireAdminPermission(AdminPermission.SETTINGS_MANAGE)
  updateSettings(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.admin.updateSettings(user.id, dto);
  }

  // --- Litiges ---

  @Get("disputes")
  @RequireAdminPermission(AdminPermission.FINANCE_VIEW)
  listDisputes(@Query("status") status?: DisputeStatus) {
    return this.admin.listDisputes(status);
  }

  @Patch("disputes/:id/resolve")
  @RequireAdminPermission(AdminPermission.FINANCE_REFUND)
  resolveDispute(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ResolveDisputeDto) {
    return this.admin.resolveDispute(user.id, id, dto);
  }

  // --- Gestion des comptes admin ---

  @Get("admins")
  @RequireAdminPermission(AdminPermission.ADMINS_MANAGE)
  listAdmins() {
    return this.admin.listAdmins();
  }

  @Post("admins")
  @RequireAdminPermission(AdminPermission.ADMINS_MANAGE)
  createAdmin(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdminDto) {
    return this.admin.createAdmin(user.id, dto);
  }

  @Patch("admins/:id")
  @RequireAdminPermission(AdminPermission.ADMINS_MANAGE)
  updateAdminLevel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateAdminLevelDto) {
    return this.admin.updateAdminLevel(user.id, id, dto);
  }

  @Delete("admins/:id")
  @RequireAdminPermission(AdminPermission.ADMINS_MANAGE)
  deleteAdmin(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.deleteAdmin(user.id, id);
  }
}
