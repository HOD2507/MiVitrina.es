import { BadRequestException, NotFoundException } from "@nestjs/common";
import { SUPPORT_LIMITS, SupportTicketStatus } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SupportService, TICKET_CLOSED_CODE, TOO_MANY_ACTIVE_TICKETS_CODE } from "./support.service";

const NOW = new Date("2026-09-21T12:00:00Z");
const ticketRow = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  number: 7,
  subject: "Asunto",
  category: "PAYMENT",
  status: "OPEN",
  createdAt: NOW,
  lastMessageAt: NOW,
  lastMessageStaff: false,
  lastStaffReplyAt: null,
  userLastReadAt: NOW,
  ...over,
});

function build(opts: { ticket?: unknown; active?: number } = {}) {
  const prisma = {
    supportTicket: {
      count: jest.fn().mockResolvedValue(opts.active ?? 0),
      create: jest.fn().mockResolvedValue(ticketRow()),
      findMany: jest.fn().mockResolvedValue([ticketRow()]),
      findFirst: jest.fn().mockResolvedValue(opts.ticket === undefined ? ticketRow() : opts.ticket),
      update: jest.fn().mockResolvedValue({}),
    },
    supportMessage: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "m1", content: "x", fromStaff: false, createdAt: NOW }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ count: 2 }]),
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { service: new SupportService(prisma as unknown as PrismaService), prisma };
}

describe("SupportService (lado usuario)", () => {
  it("crea el ticket con su primer mensaje del usuario y lo deja como leído", async () => {
    const { service, prisma } = build();

    await service.createTicket("u1", { subject: "Asunto", category: "PAYMENT", message: "Hola" });

    const data = prisma.supportTicket.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: "u1", subject: "Asunto", category: "PAYMENT" });
    expect(data.messages.create).toEqual({ senderId: "u1", fromStaff: false, content: "Hola" });
    expect(data.userLastReadAt).toBeInstanceOf(Date);
  });

  it("tope de tickets activos por usuario → 400 con código TOO_MANY_ACTIVE_TICKETS", async () => {
    const { service, prisma } = build({ active: SUPPORT_LIMITS.MAX_ACTIVE_TICKETS_PER_USER });

    const error = await service.createTicket("u1", { subject: "Asunto", category: "OTHER", message: "Hola" }).catch((e: unknown) => e);

    expect((error as BadRequestException).getResponse()).toMatchObject({ code: TOO_MANY_ACTIVE_TICKETS_CODE });
    expect(prisma.supportTicket.create).not.toHaveBeenCalled();
  });

  it("el hilo del usuario NUNCA incluye notas internas ni datos del autor del equipo", async () => {
    const { service, prisma } = build();

    await service.getMine("u1", "t1");

    const args = prisma.supportMessage.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ ticketId: "t1", isInternal: false });
    expect(Object.keys(args.select).sort()).toEqual(["content", "createdAt", "fromStaff", "id"]);
  });

  it("un ticket ajeno (o inexistente) da 404, sin revelar que existe", async () => {
    const { service, prisma } = build({ ticket: null });

    await expect(service.getMine("u1", "t-otro")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.supportTicket.findFirst.mock.calls[0][0].where).toEqual({ id: "t-otro", userId: "u1" });
  });

  it("abrir un ticket con respuesta del equipo sin leer lo marca leído; sin novedades no escribe", async () => {
    const unread = build({ ticket: ticketRow({ lastStaffReplyAt: new Date(NOW.getTime() + 1000) }) });
    const result = await unread.service.getMine("u1", "t1");
    expect(result.unread).toBe(false);
    expect(unread.prisma.supportTicket.update).toHaveBeenCalledTimes(1);

    const read = build();
    await read.service.getMine("u1", "t1");
    expect(read.prisma.supportTicket.update).not.toHaveBeenCalled();
  });

  it("la lista marca 'unread' solo si el equipo respondió después de la última lectura", async () => {
    const { service, prisma } = build();
    prisma.supportTicket.findMany.mockResolvedValue([
      ticketRow({ id: "a", lastStaffReplyAt: new Date(NOW.getTime() + 5000), userLastReadAt: NOW }),
      ticketRow({ id: "b", lastStaffReplyAt: NOW, userLastReadAt: NOW }),
      ticketRow({ id: "c", lastStaffReplyAt: NOW, userLastReadAt: null }),
      ticketRow({ id: "d", lastStaffReplyAt: null, userLastReadAt: null }),
    ]);

    const list = await service.listMine("u1");

    expect(list.map((t) => [t.id, t.unread])).toEqual([["a", true], ["b", false], ["c", true], ["d", false]]);
    // La lista tampoco lleva mensajes ni prioridad.
    expect(Object.keys(list[0])).not.toContain("messages");
    expect(Object.keys(list[0])).not.toContain("priority");
  });

  it("responder en un ticket cerrado → 400 TICKET_CLOSED y no se guarda nada", async () => {
    const { service, prisma } = build({ ticket: ticketRow({ status: SupportTicketStatus.CLOSED }) });

    const error = await service.reply("u1", "t1", "Hola").catch((e: unknown) => e);

    expect((error as BadRequestException).getResponse()).toMatchObject({ code: TICKET_CLOSED_CODE });
    expect(prisma.supportMessage.create).not.toHaveBeenCalled();
  });

  it("responder en un ticket Resuelto lo reabre; en uno abierto no cambia el estado", async () => {
    const resolved = build({ ticket: ticketRow({ status: SupportTicketStatus.RESOLVED }) });
    await resolved.service.reply("u1", "t1", "Sigue fallando");
    expect(resolved.prisma.supportTicket.update.mock.calls[0][0].data).toMatchObject({ status: "OPEN", resolvedAt: null, lastMessageStaff: false });

    const open = build({ ticket: ticketRow({ status: SupportTicketStatus.IN_PROGRESS }) });
    await open.service.reply("u1", "t1", "Gracias");
    expect(open.prisma.supportTicket.update.mock.calls[0][0].data).not.toHaveProperty("status");
  });

  it("unreadCount devuelve el número calculado en SQL", async () => {
    const { service } = build();
    await expect(service.unreadCount("u1")).resolves.toEqual({ count: 2 });
  });
});
