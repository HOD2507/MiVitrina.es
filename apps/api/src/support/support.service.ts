import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@mivitrina/database";
import { SUPPORT_LIMITS, SupportTicketStatus } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";

export const TICKET_CLOSED_CODE = "TICKET_CLOSED";
export const TOO_MANY_ACTIVE_TICKETS_CODE = "TOO_MANY_ACTIVE_TICKETS";

const ACTIVE_STATUSES = [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS];

/**
 * Lado usuario del soporte (anunciante o comerciante). Regla de oro: lo que sale de aquí NUNCA contiene
 * notas internas ni datos del miembro del equipo (email, id) — los mensajes del equipo se exponen solo
 * como `fromStaff: true`. Cualquier consulta de mensajes filtra `isInternal: false`.
 */
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /** No leído = el equipo respondió después de la última vez que el usuario abrió el ticket. */
  private static isUnread(t: { lastStaffReplyAt: Date | null; userLastReadAt: Date | null }): boolean {
    return t.lastStaffReplyAt !== null && (t.userLastReadAt === null || t.userLastReadAt < t.lastStaffReplyAt);
  }

  private static summary(t: {
    id: string;
    number: number;
    subject: string;
    category: string;
    status: string;
    lastMessageAt: Date;
    lastStaffReplyAt: Date | null;
    userLastReadAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: t.id,
      number: t.number,
      subject: t.subject,
      category: t.category,
      status: t.status,
      createdAt: t.createdAt,
      lastMessageAt: t.lastMessageAt,
      unread: SupportService.isUnread(t),
    };
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    const active = await this.prisma.supportTicket.count({ where: { userId, status: { in: ACTIVE_STATUSES } } });
    if (active >= SUPPORT_LIMITS.MAX_ACTIVE_TICKETS_PER_USER) {
      throw new BadRequestException({
        message: `Vous avez déjà ${SUPPORT_LIMITS.MAX_ACTIVE_TICKETS_PER_USER} demandes de support en cours. Attendez une réponse ou complétez l'une d'elles.`,
        code: TOO_MANY_ACTIVE_TICKETS_CODE,
      });
    }

    const now = new Date();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        category: dto.category,
        lastMessageAt: now,
        userLastReadAt: now,
        messages: { create: { senderId: userId, fromStaff: false, content: dto.message } },
      },
    });
    return SupportService.summary(ticket);
  }

  async listMine(userId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
    return tickets.map((t) => SupportService.summary(t));
  }

  /** Cuenta de tickets con respuesta sin leer — alimenta el indicador del menú. */
  async unreadCount(userId: string) {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM support_tickets
      WHERE "userId" = ${userId}
        AND "lastStaffReplyAt" IS NOT NULL
        AND ("userLastReadAt" IS NULL OR "userLastReadAt" < "lastStaffReplyAt")
    `);
    return { count: rows[0]?.count ?? 0 };
  }

  /** 404 (no 403) si el ticket es de otro usuario: no se revela que exista. */
  private async getOwnTicketOrThrow(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, userId } });
    if (!ticket) throw new NotFoundException("Demande de support introuvable.");
    return ticket;
  }

  /** Abre el ticket: devuelve el hilo visible (sin notas internas) y lo marca como leído. */
  async getMine(userId: string, ticketId: string) {
    const ticket = await this.getOwnTicketOrThrow(userId, ticketId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId, isInternal: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, content: true, fromStaff: true, createdAt: true },
    });

    if (SupportService.isUnread(ticket)) {
      await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { userLastReadAt: new Date() } });
    }

    return { ...SupportService.summary(ticket), unread: false, messages };
  }

  async reply(userId: string, ticketId: string, content: string) {
    const ticket = await this.getOwnTicketOrThrow(userId, ticketId);
    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException({
        message: "Cette demande est fermée. Ouvrez une nouvelle demande de support.",
        code: TICKET_CLOSED_CODE,
      });
    }

    const now = new Date();
    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: { ticketId, senderId: userId, fromStaff: false, content },
        select: { id: true, content: true, fromStaff: true, createdAt: true },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          lastMessageAt: now,
          lastMessageStaff: false,
          userLastReadAt: now,
          // Responder a un ticket "Resuelto" es decir que no lo está: vuelve a la bandeja como abierto.
          ...(ticket.status === SupportTicketStatus.RESOLVED
            ? { status: SupportTicketStatus.OPEN, resolvedAt: null }
            : {}),
        },
      }),
    ]);
    return message;
  }
}
