import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateTicketDto } from "./create-ticket.dto";
import { StaffReplyDto } from "./reply-ticket.dto";
import { UpdateTicketDto } from "./update-ticket.dto";

const check = async <T extends object>(cls: new () => T, plain: object) => validate(plainToInstance(cls, plain), { whitelist: true, forbidNonWhitelisted: true });

describe("DTOs de soporte", () => {
  const ok = { subject: "  Problema con un pago  ", category: "PAYMENT", message: "  Hola  " };

  it("un ticket válido pasa, y asunto y mensaje se recortan", async () => {
    expect(await check(CreateTicketDto, ok)).toHaveLength(0);
    const dto = plainToInstance(CreateTicketDto, ok);
    expect(dto.subject).toBe("Problema con un pago");
    expect(dto.message).toBe("Hola");
  });

  it.each([
    ["categoría desconocida", { ...ok, category: "BILLING" }],
    ["asunto demasiado corto", { ...ok, subject: "ab" }],
    ["asunto solo con espacios", { ...ok, subject: "     " }],
    ["mensaje solo con espacios", { ...ok, message: "    " }],
    ["mensaje de más de 5000 caracteres", { ...ok, message: "x".repeat(5001) }],
    ["campo no permitido (priority: el usuario no la elige)", { ...ok, priority: "URGENT" }],
  ])("rechaza: %s", async (_label, body) => {
    expect((await check(CreateTicketDto, body)).length).toBeGreaterThan(0);
  });

  it("la respuesta del equipo acepta 'internal' booleano y nada más", async () => {
    expect(await check(StaffReplyDto, { content: "Hola", internal: true })).toHaveLength(0);
    expect((await check(StaffReplyDto, { content: "Hola", internal: "yes" })).length).toBeGreaterThan(0);
  });

  it("actualización: estados y prioridades solo los del enum", async () => {
    expect(await check(UpdateTicketDto, { status: "RESOLVED", priority: "URGENT" })).toHaveLength(0);
    expect((await check(UpdateTicketDto, { status: "DONE" })).length).toBeGreaterThan(0);
  });
});
