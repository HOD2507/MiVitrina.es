import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@mivitrina/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser, CurrentUser } from "../auth/decorators/current-user.decorator";
import { SupportService } from "./support.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ReplyTicketDto } from "./dto/reply-ticket.dto";

/** Tickets de soporte del propio usuario (anunciante o comerciante). Los admins usan /admin/support. */
@Roles(UserRole.ANNONCEUR, UserRole.COMMERCANT)
@Controller("support")
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post("tickets")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.support.createTicket(user.id, dto);
  }

  @Get("tickets")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.support.listMine(user.id);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.support.unreadCount(user.id);
  }

  @Get("tickets/:id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.support.getMine(user.id, id);
  }

  @Post("tickets/:id/messages")
  reply(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ReplyTicketDto) {
    return this.support.reply(user.id, id, dto.content);
  }
}
