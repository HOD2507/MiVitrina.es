import { BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReservationsService } from "../reservations/reservations.service";
import { StripeService } from "../stripe/stripe.service";
import { WebhooksController } from "./webhooks.controller";

describe("WebhooksController — registro y resultado de cada evento", () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  const req = { rawBody: Buffer.from("{}") } as never;
  const sessionEvent = (extra: Record<string, unknown> = {}) => ({
    id: "evt_1",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_1", metadata: { reservationId: "r1" }, ...extra },
    },
  });

  function build(event: unknown, markPaid: jest.Mock = jest.fn().mockResolvedValue("PAID")) {
    const stripe = { constructWebhookEvent: jest.fn().mockReturnValue(event) };
    const prisma = { commercantProfile: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const controller = new WebhooksController(
      stripe as unknown as StripeService,
      prisma as unknown as PrismaService,
      { markPaid } as unknown as ReservationsService,
    );
    return { controller, stripe, markPaid };
  }
  const logged = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => String(c[0])).join("\n");

  it("evento recibido + procesado: registra id/tipo y el resultado, y guarda sesión y payment_intent", async () => {
    const { controller, markPaid } = build(sessionEvent());

    await expect(controller.handleStripeWebhook(req, "sig")).resolves.toEqual({ received: true });

    expect(markPaid).toHaveBeenCalledWith("r1", "pi_1", "cs_1");
    expect(logged(logSpy)).toContain("Événement reçu evt_1 type=checkout.session.completed livemode=false");
    expect(logged(logSpy)).toContain("transaction passée à PAID");
  });

  it("repetición: registra 'déjà traité' y responde 200", async () => {
    const { controller } = build(sessionEvent(), jest.fn().mockResolvedValue("ALREADY_PAID"));

    await expect(controller.handleStripeWebhook(req, "sig")).resolves.toEqual({ received: true });
    expect(logged(logSpy)).toContain("déjà traité");
  });

  it("pago sobre una transacción ya cancelada: error en el registro (para decidir un reembolso) pero 200 a Stripe", async () => {
    const { controller } = build(sessionEvent(), jest.fn().mockResolvedValue("UNEXPECTED_STATUS"));

    await expect(controller.handleStripeWebhook(req, "sig")).resolves.toEqual({ received: true });
    expect(logged(errorSpy)).toContain("remboursement manuel");
  });

  it("tipo no gestionado: se registra como ignorado", async () => {
    const { controller, markPaid } = build({ id: "evt_2", type: "charge.updated", livemode: false, data: { object: {} } });

    await controller.handleStripeWebhook(req, "sig");
    expect(markPaid).not.toHaveBeenCalled();
    expect(logged(logSpy)).toContain("evt_2 (charge.updated) : ignoré");
  });

  it("firma inválida: 400 y aviso en el registro (causa típica: secreto de otra cuenta)", async () => {
    const { controller, stripe } = build(null);
    stripe.constructWebhookEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload");
    });

    await expect(controller.handleStripeWebhook(req, "sig")).rejects.toBeInstanceOf(BadRequestException);
    expect(logged(warnSpy)).toContain("signature invalide");
  });

  it("fallo al procesar: lo registra como error y lo relanza para que Stripe reintente", async () => {
    const { controller } = build(sessionEvent(), jest.fn().mockRejectedValue(new Error("db caída")));

    await expect(controller.handleStripeWebhook(req, "sig")).rejects.toThrow("db caída");
    expect(logged(errorSpy)).toContain("échec du traitement — db caída");
  });

  it("no registra el cuerpo del evento ni datos personales", async () => {
    const { controller } = build(sessionEvent({ customer_email: "secreto@ejemplo.com" }));

    await controller.handleStripeWebhook(req, "sig");
    const all = logged(logSpy) + logged(warnSpy) + logged(errorSpy);
    expect(all).not.toContain("secreto@ejemplo.com");
  });
});
