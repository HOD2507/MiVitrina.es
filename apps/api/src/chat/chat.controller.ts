import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@mivitrina/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { ChatService } from "./chat.service";
import { CreateThreadDto } from "./dto/create-thread.dto";
import { SendMessageDto } from "./dto/send-message.dto";

/**
 * Pas de @Roles au niveau du contrôleur : la lecture/l'envoi de messages
 * sont ouverts à tout utilisateur authentifié, la vérification d'accès
 * réelle se fait par appartenance à la conversation (ChatService).
 * Seule la création d'une conversation est réservée à l'annonceur — c'est
 * lui qui initie le contact avec un commerçant.
 */
@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Roles(UserRole.ANNONCEUR)
  @Post("threads")
  createThread(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateThreadDto) {
    return this.chat.getOrCreateThread(user.id, dto.commercantProfileId, dto.reservationId);
  }

  @Get("threads")
  listThreads(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.listThreads(user.id);
  }

  @Get("threads/:id/messages")
  listMessages(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.chat.listMessages(user.id, id);
  }

  @Post("threads/:id/messages")
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(user.id, id, dto.content);
  }
}
