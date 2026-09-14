import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { DisputeStatus, UserRole } from "@mivitrina/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { AdminService } from "./admin.service";
import { ReviewVerificationDto } from "./dto/review-verification.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { ResolveDisputeDto } from "./dto/resolve-dispute.dto";

@Controller("admin")
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("stats")
  getStats() {
    return this.admin.getStats();
  }

  @Get("commercants/pending-verification")
  listPendingVerifications() {
    return this.admin.listPendingVerifications();
  }

  @Patch("commercants/:id/verification")
  reviewVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.admin.reviewVerification(user.id, id, dto);
  }

  @Get("settings")
  getSettings() {
    return this.admin.getSettings();
  }

  @Patch("settings")
  updateSettings(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.admin.updateSettings(user.id, dto);
  }

  @Get("disputes")
  listDisputes(@Query("status") status?: DisputeStatus) {
    return this.admin.listDisputes(status);
  }

  @Patch("disputes/:id/resolve")
  resolveDispute(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ResolveDisputeDto) {
    return this.admin.resolveDispute(user.id, id, dto);
  }
}
