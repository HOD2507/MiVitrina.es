import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@mivitrina/database";
import { AdminAuditAction, SupportTicketStatus } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { ListTicketsQueryDto } from "./dto/list-tickets-query.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { buildSupportReplyEmail } from "./support-email";

const ACTIVE_STATUSES = [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS];
const LIST_LIMIT = 200;
const RECENT_RESERVATIONS = 10;

/** Lado equipo (admin): bandeja, hilo completo con notas internas, respuestas y cambios de estado/prioridad. */
@Injectable()
export class SupportAdminService {
  private readonly logger = new Logger(SupportAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Nombre "humano" de la cuenta según su tipo (nunca solo el email si hay algo mejor). */
  private static displayName(u: {
    email: string;
    name: string | null;
    commercantProfile?: { businessName: string } | null;
    annonceurProfile?: { displayName: string | null; companyName: string | null } | null;
  }): string {
    return (
      u.commercantProfile?.businessName ||
      u.annonceurProfile?.displayName ||
      u.annonceurProfile?.companyName ||
      u.name ||
      u.email
    );
  }

  async list(query: ListTicketsQueryDto) {
    const where: Prisma.SupportTicketWhereInput = {};

    const status = query.status ?? "ACTIVE";
    if (status === "ACTIVE") where.status = { in: ACTIVE_STATUSES };
    else if (status !== "ALL") where.status = status;

    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;
    // "Espera al equipo": el último mensaje es del usuario, y el ticket sigue vivo.
    if (query.awaiting === "staff") {
      where.lastMessageStaff = false;
      where.status = { in: ACTIVE_STATUSES };
    }

    if (query.search) {
      const s = query.search.trim();
      const number = /^#?(\d{1,9})$/.exec(s);
      where.OR = [
        { subject: { contains: s, mode: "insensitive" } },
        { user: { email: { contains: s, mode: "insensitive" } } },
        ...(number ? [{ number: Number(number[1]) }] : []),
      ];
    }

    const [tickets, grouped] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        // URGENT antes que NORMAL (orden de declaración del enum), y dentro de cada uno lo más reciente primero.
        orderBy: [{ priority: "desc" }, { lastMessageAt: "desc" }],
        take: LIST_LIMIT,
        include: {
          user: {
            select: {
              email: true,
              name: true,
              role: true,
              commercantProfile: { select: { businessName: true } },
              annonceurProfile: { select: { displayName: true, companyName: true } },
            },
          },
        },
      }),
      // Contadores por estado para las pestañas (sin los filtros de categoría/búsqueda: son el panorama global).
      this.prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const counts: Record<string, number> = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };
    for (const g of grouped) counts[g.status] = g._count._all;

    return {
      counts,
      tickets: tickets.map((t) => ({
        id: t.id,
        number: t.number,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        lastMessageAt: t.lastMessageAt,
        awaitingStaff: !t.lastMessageStaff && (ACTIVE_STATUSES as string[]).includes(t.status),
        user: {
          email: t.user.email,
          role: t.user.role,
          displayName: SupportAdminService.displayName(t.user),
        },
      })),
    };
  }

  async getOne(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { email: true, name: true } } },
        },
        user: {
          include: {
            commercantProfile: { select: { id: true, businessName: true, verificationStatus: true } },
            annonceurProfile: { select: { id: true, displayName: true, companyName: true } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException("Demande de support introuvable.");

    const { user } = ticket;
    const reservationWhere: Prisma.ReservationWhereInput | null = user.commercantProfile
      ? { space: { commercantProfileId: user.commercantProfile.id } }
      : user.annonceurProfile
        ? { annonceurProfileId: user.annonceurProfile.id }
        : null;

    const reservations = reservationWhere
      ? await this.prisma.reservation.findMany({
          where: reservationWhere,
          orderBy: { createdAt: "desc" },
          take: RECENT_RESERVATIONS,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            space: { select: { name: true, commercantProfile: { select: { businessName: true } } } },
            transaction: { select: { amount: true, status: true } },
          },
        })
      : [];

    return {
      id: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      lastMessageAt: ticket.lastMessageAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        content: m.content,
        fromStaff: m.fromStaff,
        isInternal: m.isInternal,
        createdAt: m.createdAt,
        // Quién del equipo escribió (null si esa cuenta se eliminó después).
        staffAuthor: m.fromStaff ? (m.sender?.name ?? m.sender?.email ?? null) : null,
      })),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        locale: user.locale,
        suspended: user.suspended,
        createdAt: user.createdAt,
        displayName: SupportAdminService.displayName(user),
        verificationStatus: user.commercantProfile?.verificationStatus ?? null,
      },
      reservations: reservations.map((r) => ({
        id: r.id,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        createdAt: r.createdAt,
        spaceName: r.space.name,
        businessName: r.space.commercantProfile.businessName,
        amount: r.transaction ? Number(r.transaction.amount) : null,
        paymentStatus: r.transaction?.status ?? null,
      })),
    };
  }

  /**
   * Respuesta del equipo (avisa por email al usuario) o nota interna (no la ve el usuario, no manda email,
   * no mueve el orden de su lista). La primera respuesta pública pasa el ticket de OPEN a IN_PROGRESS.
   */
  async reply(admin: AuthenticatedUser, ticketId: string, content: string, internal = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { email: true, locale: true } } },
    });
    if (!ticket) throw new NotFoundException("Demande de support introuvable.");
    if (!internal && ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException(
        "Ticket fermé : rouvrez-le avant de répondre à l'utilisateur (une note interne reste possible).",
      );
    }

    const now = new Date();
    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: { ticketId, senderId: admin.id, fromStaff: true, content, isInternal: internal },
        select: { id: true, content: true, fromStaff: true, isInternal: true, createdAt: true },
      }),
      ...(internal
        ? []
        : [
            this.prisma.supportTicket.update({
              where: { id: ticketId },
              data: {
                lastMessageAt: now,
                lastMessageStaff: true,
                lastStaffReplyAt: now,
                ...(ticket.status === SupportTicketStatus.OPEN ? { status: SupportTicketStatus.IN_PROGRESS } : {}),
              },
            }),
          ]),
    ]);

    if (!internal) await this.notifyUser(ticket, content);
    return message;
  }

  /** Best effort: un fallo de envío (p. ej. dominio Resend sin verificar) no debe perder la respuesta ya guardada. */
  private async notifyUser(
    ticket: { id: string; number: number; subject: string; user: { email: string; locale: "ES" | "EN" } },
    reply: string,
  ) {
    const url = `${this.config.get<string>("WEB_APP_URL")}/${ticket.user.locale.toLowerCase()}/soporte/${ticket.id}`;
    const { subject, html } = buildSupportReplyEmail({
      locale: ticket.user.locale,
      ticketNumber: ticket.number,
      ticketSubject: ticket.subject,
      reply,
      url,
    });
    try {
      await this.mail.send({ to: ticket.user.email, subject, html });
      this.logger.log(`Ticket #${ticket.number}: aviso de respuesta enviado.`);
    } catch (err) {
      this.logger.error(
        `Ticket #${ticket.number}: la respuesta se guardó pero el aviso por email falló — ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async update(admin: AuthenticatedUser, ticketId: string, dto: UpdateTicketDto) {
    if (!dto.status && !dto.priority) {
      throw new BadRequestException("Indiquez un statut ou une priorité.");
    }
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Demande de support introuvable.");

    const now = new Date();
    const data: Prisma.SupportTicketUpdateInput = {};
    if (dto.priority) data.priority = dto.priority;
    if (dto.status && dto.status !== ticket.status) {
      data.status = dto.status;
      if (dto.status === SupportTicketStatus.RESOLVED) {
        data.resolvedAt = now;
        data.closedAt = null;
      } else if (dto.status === SupportTicketStatus.CLOSED) {
        data.closedAt = now;
        data.resolvedAt = ticket.resolvedAt ?? now;
      } else {
        // OPEN / IN_PROGRESS: el ticket vuelve a estar vivo.
        data.resolvedAt = null;
        data.closedAt = null;
      }
    }

    const updated = await this.prisma.supportTicket.update({ where: { id: ticketId }, data });

    const statusChange = dto.status && dto.status !== ticket.status ? { from: ticket.status, to: dto.status } : null;
    const priorityChange = dto.priority && dto.priority !== ticket.priority ? { from: ticket.priority, to: dto.priority } : null;
    if (statusChange || priorityChange) {
      await this.prisma.auditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: AdminAuditAction.SUPPORT_TICKET_UPDATE,
          targetType: "support_ticket",
          targetId: ticketId,
          targetLabel: `#${ticket.number} ${ticket.subject}`.slice(0, 160),
          metadata: { ...(statusChange ? { status: statusChange } : {}), ...(priorityChange ? { priority: priorityChange } : {}) },
        },
      });
    }

    return {
      id: updated.id,
      status: updated.status,
      priority: updated.priority,
      resolvedAt: updated.resolvedAt,
      closedAt: updated.closedAt,
    };
  }
}
