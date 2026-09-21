import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { AdminPermission, UserRole } from "@mivitrina/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequireAdminPermission } from "../auth/decorators/admin-permission.decorator";
import { AuthenticatedUser, CurrentUser } from "../auth/decorators/current-user.decorator";
import { SupportAdminService } from "./support-admin.service";
import { ListTicketsQueryDto } from "./dto/list-tickets-query.dto";
import { StaffReplyDto } from "./dto/reply-ticket.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";

/** Bandeja de soporte del panel admin (permiso `support.manage`: SUPERADMIN y SUPPORT). */
@Roles(UserRole.ADMIN)
@RequireAdminPermission(AdminPermission.SUPPORT_MANAGE)
@Controller("admin/support")
export class SupportAdminController {
  constructor(private readonly support: SupportAdminService) {}

  @Get("tickets")
  list(@Query() query: ListTicketsQueryDto) {
    return this.support.list(query);
  }

  @Get("awaiting-count")
  awaitingCount() {
    return this.support.awaitingCount();
  }

  @Get("tickets/:id")
  get(@Param("id") id: string) {
    return this.support.getOne(id);
  }

  @Post("tickets/:id/messages")
  reply(@CurrentUser() admin: AuthenticatedUser, @Param("id") id: string, @Body() dto: StaffReplyDto) {
    return this.support.reply(admin, id, dto.content, dto.internal ?? false);
  }

  @Patch("tickets/:id")
  update(@CurrentUser() admin: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateTicketDto) {
    return this.support.update(admin, id, dto);
  }
}
