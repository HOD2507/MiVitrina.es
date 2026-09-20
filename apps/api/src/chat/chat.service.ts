import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@mivitrina/database";
import { getAnnonceurDisplayName } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { moderateChatMessage } from "./chat-moderation";

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ownership : l'utilisateur courant doit être l'une des deux parties de la conversation. */
  private async getOwnThreadOrThrow(userId: string, threadId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { commercantProfile: true, annonceurProfile: true },
    });
    if (!thread || (thread.commercantProfile.userId !== userId && thread.annonceurProfile.userId !== userId)) {
      throw new NotFoundException("Conversation introuvable.");
    }
    return thread;
  }

  /**
   * Annonceur uniquement : ouvre (ou récupère) la conversation avec un
   * commerçant. Une seule conversation existe par paire commerçant/
   * annonceur (contrainte unique en base) — `reservationId` permet juste
   * de relier la conversation à une demande de réservation en cours pour
   * l'affichage, sans en créer une nouvelle par réservation.
   */
  async getOrCreateThread(userId: string, commercantProfileId: string, reservationId?: string) {
    const annonceurProfile = await this.prisma.annonceurProfile.findUnique({ where: { userId } });
    if (!annonceurProfile) {
      throw new BadRequestException("Profil annonceur introuvable.");
    }

    const commercantProfile = await this.prisma.commercantProfile.findUnique({
      where: { id: commercantProfileId },
    });
    if (!commercantProfile) {
      throw new NotFoundException("Commerce introuvable.");
    }

    return this.prisma.chatThread.upsert({
      where: {
        commercantProfileId_annonceurProfileId: {
          commercantProfileId,
          annonceurProfileId: annonceurProfile.id,
        },
      },
      update: reservationId ? { reservationId } : {},
      create: { commercantProfileId, annonceurProfileId: annonceurProfile.id, reservationId },
    });
  }

  /** Liste les conversations de l'utilisateur courant (commerçant ou annonceur), plus récentes d'abord. */
  async listThreads(userId: string) {
    const [commercantProfile, annonceurProfile, viewer] = await Promise.all([
      this.prisma.commercantProfile.findUnique({ where: { userId } }),
      this.prisma.annonceurProfile.findUnique({ where: { userId } }),
      // Langue de la personne qui consulte : sert au libellé de repli d'un annonceur sans nom.
      this.prisma.user.findUnique({ where: { id: userId }, select: { locale: true } }),
    ]);

    const where: Prisma.ChatThreadWhereInput[] = [];
    if (commercantProfile) where.push({ commercantProfileId: commercantProfile.id });
    if (annonceurProfile) where.push({ annonceurProfileId: annonceurProfile.id });
    if (where.length === 0) return [];

    const threads = await this.prisma.chatThread.findMany({
      where: { OR: where },
      orderBy: { updatedAt: "desc" },
      include: {
        commercantProfile: true,
        // Pas d'email ici : le commerçant voit l'annonceur par son nom public uniquement.
        annonceurProfile: { select: { displayName: true, companyName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: {
          select: { messages: { where: { senderId: { not: userId }, readAt: null } } },
        },
      },
    });

    return threads.map((thread) => ({
      id: thread.id,
      otherPartyName:
        userId === thread.commercantProfile.userId
          ? getAnnonceurDisplayName(thread.annonceurProfile, viewer?.locale)
          : thread.commercantProfile.businessName,
      lastMessage: thread.messages[0]
        ? { content: thread.messages[0].content, createdAt: thread.messages[0].createdAt }
        : null,
      unreadCount: thread._count.messages,
      updatedAt: thread.updatedAt,
    }));
  }

  /** Renvoie les messages d'une conversation et marque comme lus ceux de l'autre partie. */
  async listMessages(userId: string, threadId: string) {
    await this.getOwnThreadOrThrow(userId, threadId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    await this.prisma.chatMessage.updateMany({
      where: { threadId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });

    return messages;
  }

  async sendMessage(userId: string, threadId: string, rawContent: string) {
    await this.getOwnThreadOrThrow(userId, threadId);

    const { content, flagged, flagReason } = moderateChatMessage(rawContent);

    return this.prisma.chatMessage.create({
      data: { threadId, senderId: userId, content, flagged, flagReason },
    });
  }
}
