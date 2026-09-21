import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdminAuditAction, SupportTicketStatus } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { SupportAdminService } from "./support-admin.service";

const ADMIN = { id: "admin-1", email: "soporte@mivitrina.es", role: "ADMIN", adminLevel: "SUPPORT" } as never;
const NOW = new Date("2026-09-21T12:00:00Z");

function ticket(over: Record<string, unknown> = {}) {
  return {
    id: "t1",
    number: 12,
    subject: "Pago duplicado",
    status: "OPEN",
    priority: "NORMAL",
    resolvedAt: null,
    user: { email: "user@example.com", locale: "EN" },
    ...over,
  };
}

function build(t: unknown = ticket()) {
  const prisma = {
    supportTicket: {
      findUnique: jest.fn().mockResolvedValue(t),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([{ status: "OPEN", _count: { _all: 3 } }]),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "t1", status: "OPEN", priority: "NORMAL", resolvedAt: null, closedAt: null, ...data })),
    },
    supportMessage: { create: jest.fn().mockResolvedValue({ id: "m1" }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const mail = { send: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue("https://mivitrina.es") };
  const service = new SupportAdminService(prisma as unknown as PrismaService, mail as unknown as MailService, config as unknown as ConfigService);
  return { service, prisma, mail };
}

describe("SupportAdminService", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  describe("bandeja", () => {
    it("por defecto solo tickets vivos (OPEN + IN_PROGRESS), urgentes primero y luego lo más reciente", async () => {
      const { service, prisma } = build();

      const result = await service.list({});

      const args = prisma.supportTicket.findMany.mock.calls[0][0];
      expect(args.where.status).toEqual({ in: ["OPEN", "IN_PROGRESS"] });
      expect(args.orderBy).toEqual([{ priority: "desc" }, { lastMessageAt: "desc" }]);
      expect(result.counts).toEqual({ OPEN: 3, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 });
    });

    it("filtra por estado y categoría, y busca por #número, asunto o email", async () => {
      const { service, prisma } = build();

      await service.list({ status: "RESOLVED", category: "PAYMENT", search: "#12" });

      const where = prisma.supportTicket.findMany.mock.calls[0][0].where;
      expect(where.status).toBe("RESOLVED");
      expect(where.category).toBe("PAYMENT");
      expect(where.OR).toEqual(expect.arrayContaining([{ number: 12 }, { subject: { contains: "#12", mode: "insensitive" } }]));
    });

    it("'ALL' no filtra por estado", async () => {
      const { service, prisma } = build();
      await service.list({ status: "ALL" });
      expect(prisma.supportTicket.findMany.mock.calls[0][0].where).not.toHaveProperty("status");
    });
  });

  describe("indicador del menú", () => {
    it("cuenta solo tickets vivos que esperan respuesta del equipo", async () => {
      const { service, prisma } = build();
      (prisma.supportTicket as unknown as { count: jest.Mock }).count = jest.fn().mockResolvedValue(4);

      await expect(service.awaitingCount()).resolves.toEqual({ count: 4 });

      expect((prisma.supportTicket as unknown as { count: jest.Mock }).count).toHaveBeenCalledWith({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] }, lastMessageStaff: false },
      });
    });
  });

  describe("responder", () => {
    it("respuesta pública: guarda, pasa OPEN → IN_PROGRESS, marca respuesta del equipo y avisa por email en el idioma del usuario", async () => {
      const { service, prisma, mail } = build();

      await service.reply(ADMIN, "t1", "Ya lo hemos corregido");

      expect(prisma.supportMessage.create.mock.calls[0][0].data).toMatchObject({ fromStaff: true, isInternal: false, senderId: "admin-1" });
      expect(prisma.supportTicket.update.mock.calls[0][0].data).toMatchObject({ status: "IN_PROGRESS", lastMessageStaff: true });
      expect(prisma.supportTicket.update.mock.calls[0][0].data.lastStaffReplyAt).toBeInstanceOf(Date);
      const mailArgs = mail.send.mock.calls[0][0];
      expect(mailArgs.to).toBe("user@example.com");
      expect(mailArgs.subject).toContain("Reply to your support request #12");
      expect(mailArgs.html).toContain("https://mivitrina.es/en/soporte/t1");
    });

    it("nota interna: no toca el ticket (ni el orden ni el 'no leído' del usuario) y NO envía email", async () => {
      const { service, prisma, mail } = build();

      await service.reply(ADMIN, "t1", "Cliente conflictivo, ojo", true);

      expect(prisma.supportMessage.create.mock.calls[0][0].data).toMatchObject({ isInternal: true, fromStaff: true });
      expect(prisma.supportTicket.update).not.toHaveBeenCalled();
      expect(mail.send).not.toHaveBeenCalled();
    });

    it("si el email falla, la respuesta ya guardada no se pierde ni da error", async () => {
      const { service, mail } = build();
      mail.send.mockRejectedValue(new Error("dominio sin verificar"));

      await expect(service.reply(ADMIN, "t1", "Hola")).resolves.toMatchObject({ id: "m1" });
    });

    it("ticket cerrado: no se puede responder al usuario, pero sí dejar una nota interna", async () => {
      const closed = build(ticket({ status: SupportTicketStatus.CLOSED }));
      await expect(closed.service.reply(ADMIN, "t1", "Hola")).rejects.toBeInstanceOf(BadRequestException);
      await expect(closed.service.reply(ADMIN, "t1", "Nota", true)).resolves.toBeDefined();
    });

    it("ticket inexistente → 404", async () => {
      const { service } = build(null);
      await expect(service.reply(ADMIN, "nope", "Hola")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("cambiar estado / prioridad", () => {
    it("RESOLVED fija resolvedAt y deja rastro en el registro de auditoría con el antes/después", async () => {
      const { service, prisma } = build();

      await service.update(ADMIN, "t1", { status: "RESOLVED" });

      const data = prisma.supportTicket.update.mock.calls[0][0].data;
      expect(data.status).toBe("RESOLVED");
      expect(data.resolvedAt).toBeInstanceOf(Date);
      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
        adminId: "admin-1",
        action: AdminAuditAction.SUPPORT_TICKET_UPDATE,
        targetType: "support_ticket",
        targetId: "t1",
        metadata: { status: { from: "OPEN", to: "RESOLVED" } },
      });
    });

    it("reabrir (OPEN/IN_PROGRESS) borra resolvedAt/closedAt; CLOSED fija closedAt", async () => {
      const reopen = build(ticket({ status: "RESOLVED", resolvedAt: NOW }));
      await reopen.service.update(ADMIN, "t1", { status: "IN_PROGRESS" });
      expect(reopen.prisma.supportTicket.update.mock.calls[0][0].data).toMatchObject({ resolvedAt: null, closedAt: null });

      const close = build();
      await close.service.update(ADMIN, "t1", { status: "CLOSED" });
      expect(close.prisma.supportTicket.update.mock.calls[0][0].data.closedAt).toBeInstanceOf(Date);
    });

    it("prioridad: se guarda y se audita; sin cambios reales no ensucia el registro", async () => {
      const change = build();
      await change.service.update(ADMIN, "t1", { priority: "URGENT" });
      expect(change.prisma.auditLog.create.mock.calls[0][0].data.metadata).toEqual({ priority: { from: "NORMAL", to: "URGENT" } });

      const same = build();
      await same.service.update(ADMIN, "t1", { priority: "NORMAL" });
      expect(same.prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("sin estado ni prioridad → 400", async () => {
      const { service } = build();
      await expect(service.update(ADMIN, "t1", {})).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
