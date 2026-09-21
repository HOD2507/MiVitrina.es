import { BadRequestException, ConflictException, Logger } from "@nestjs/common";
import { ReservationStatus, TransactionStatus } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { StripeService } from "../stripe/stripe.service";
import { ReservationsService } from "./reservations.service";

/**
 * Garde anti-double paiement : si la réservation a déjà une session Checkout
 * encore valide, "Pagar" ne doit JAMAIS en ouvrir une seconde.
 */
describe("ReservationsService.createCheckoutSession — anti double paiement", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  const USER_ID = "user-1";
  const RESERVATION_ID = "resv-1";
  const WEB = "http://localhost:3000";

  function build(tx: { status?: TransactionStatus; stripeCheckoutSessionId?: string | null; amount?: number } = {}) {
    const transaction = {
      reservationId: RESERVATION_ID,
      status: tx.status ?? TransactionStatus.PENDING,
      amount: tx.amount ?? 20,
      stripeCheckoutSessionId: tx.stripeCheckoutSessionId ?? null,
    };
    const txClient = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      transaction: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(transaction),
        findUnique: jest.fn().mockResolvedValue({ ...transaction, status: TransactionStatus.PAID }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      reservation: {
        findUnique: jest.fn().mockResolvedValue({
          id: RESERVATION_ID,
          status: ReservationStatus.PENDING_VALIDATION,
          startDate: new Date("2026-11-02"),
          endDate: new Date("2026-11-09"),
          annonceurProfile: { userId: USER_ID, user: { email: "a@b.com", locale: "ES" } },
          space: { name: "Vitrina", commercantProfile: { businessName: "Tienda" } },
          transaction,
        }),
      },
      $transaction: jest.fn(async (fn: (t: typeof txClient) => unknown) => fn(txClient)),
    };
    const stripe = {
      retrieveCheckoutSession: jest.fn(),
      expireCheckoutSession: jest.fn().mockResolvedValue({}),
      createCheckoutSession: jest.fn().mockResolvedValue({ id: "cs_new", url: "https://checkout.stripe.com/new" }),
    };
    const service = new ReservationsService(
      prisma as unknown as PrismaService,
      {} as StorageService,
      stripe as unknown as StripeService,
    );
    return { service, txClient, stripe };
  }

  it("sans session previa: crea una y guarda su id en la transacción", async () => {
    const { service, txClient, stripe } = build();

    const result = await service.createCheckoutSession(USER_ID, RESERVATION_ID, WEB);

    expect(result).toEqual({ url: "https://checkout.stripe.com/new" });
    expect(stripe.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(txClient.transaction.update).toHaveBeenCalledWith({
      where: { reservationId: RESERVATION_ID },
      data: { stripeCheckoutSessionId: "cs_new" },
    });
  });

  it("sesión previa aún abierta y mismo importe: la reutiliza y NO crea otra", async () => {
    const { service, stripe } = build({ stripeCheckoutSessionId: "cs_open" });
    stripe.retrieveCheckoutSession.mockResolvedValue({
      id: "cs_open",
      status: "open",
      payment_status: "unpaid",
      url: "https://checkout.stripe.com/open",
      amount_total: 2000,
    });

    const result = await service.createCheckoutSession(USER_ID, RESERVATION_ID, WEB);

    expect(result).toEqual({ url: "https://checkout.stripe.com/open" });
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("sesión abierta con un importe obsoleto: la caduca y crea una nueva", async () => {
    const { service, stripe } = build({ stripeCheckoutSessionId: "cs_old", amount: 25 });
    stripe.retrieveCheckoutSession.mockResolvedValue({
      id: "cs_old",
      status: "open",
      payment_status: "unpaid",
      url: "https://checkout.stripe.com/old",
      amount_total: 2000,
    });

    const result = await service.createCheckoutSession(USER_ID, RESERVATION_ID, WEB);

    expect(stripe.expireCheckoutSession).toHaveBeenCalledWith("cs_old");
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 2500 }));
    expect(result).toEqual({ url: "https://checkout.stripe.com/new" });
  });

  it("sesión previa caducada: crea una nueva", async () => {
    const { service, stripe } = build({ stripeCheckoutSessionId: "cs_expired" });
    stripe.retrieveCheckoutSession.mockResolvedValue({ id: "cs_expired", status: "expired", payment_status: "unpaid", url: null });

    const result = await service.createCheckoutSession(USER_ID, RESERVATION_ID, WEB);

    expect(stripe.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ url: "https://checkout.stripe.com/new" });
  });

  it("ya pagada en Stripe pero sin webhook: concilia (con el cliente de la transacción) y no crea sesión", async () => {
    const { service, txClient, stripe } = build({ stripeCheckoutSessionId: "cs_paid" });
    stripe.retrieveCheckoutSession.mockResolvedValue({
      id: "cs_paid",
      status: "complete",
      payment_status: "paid",
      payment_intent: "pi_123",
    });

    const result = await service.createCheckoutSession(USER_ID, RESERVATION_ID, WEB);

    expect(result).toEqual({ paid: true });
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
    // Dentro del verrou: si usara otra conexión se bloquearía a sí mismo hasta el timeout.
    expect(txClient.transaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reservationId: RESERVATION_ID, status: TransactionStatus.PENDING },
        data: expect.objectContaining({ status: TransactionStatus.PAID, stripePaymentIntentId: "pi_123", stripeCheckoutSessionId: "cs_paid" }),
      }),
    );
  });

  it("formulario enviado pero pago aún no confirmado: bloquea con 409 (no abre otra sesión)", async () => {
    const { service, stripe } = build({ stripeCheckoutSessionId: "cs_processing" });
    stripe.retrieveCheckoutSession.mockResolvedValue({ id: "cs_processing", status: "complete", payment_status: "unpaid" });

    await expect(service.createCheckoutSession(USER_ID, RESERVATION_ID, WEB)).rejects.toBeInstanceOf(ConflictException);
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("transacción ya PAID: 400 y no toca Stripe", async () => {
    const { service, stripe } = build({ status: TransactionStatus.PAID });

    await expect(service.createCheckoutSession(USER_ID, RESERVATION_ID, WEB)).rejects.toBeInstanceOf(BadRequestException);
    expect(stripe.retrieveCheckoutSession).not.toHaveBeenCalled();
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });
});

describe("ReservationsService.markPaid — idempotencia", () => {
  function build(existing: { status: TransactionStatus; stripeCheckoutSessionId?: string | null } | null, count = 0) {
    const prisma = {
      transaction: {
        updateMany: jest.fn().mockResolvedValue({ count }),
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new ReservationsService(prisma as unknown as PrismaService, {} as StorageService, {} as StripeService);
    return { service, prisma };
  }

  it("PENDING → PAID guardando payment_intent y sesión", async () => {
    const { service, prisma } = build(null, 1);

    await expect(service.markPaid("r1", "pi_1", "cs_1")).resolves.toBe("PAID");
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reservationId: "r1", status: TransactionStatus.PENDING },
        data: expect.objectContaining({ stripePaymentIntentId: "pi_1", stripeCheckoutSessionId: "cs_1" }),
      }),
    );
  });

  it("repetición del evento: ALREADY_PAID sin volver a escribir paidAt", async () => {
    const { service, prisma } = build({ status: TransactionStatus.PAID, stripeCheckoutSessionId: "cs_1" });

    await expect(service.markPaid("r1", "pi_1", "cs_1")).resolves.toBe("ALREADY_PAID");
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it("repetición sobre un pago antiguo sin sesión guardada: solo completa el id de sesión", async () => {
    const { service, prisma } = build({ status: TransactionStatus.PAID, stripeCheckoutSessionId: null });

    await expect(service.markPaid("r1", "pi_1", "cs_1")).resolves.toBe("ALREADY_PAID");
    expect(prisma.transaction.update).toHaveBeenCalledWith({ where: { reservationId: "r1" }, data: { stripeCheckoutSessionId: "cs_1" } });
  });

  it("transacción cancelada (FAILED): no se reabre, se avisa como UNEXPECTED_STATUS", async () => {
    const { service, prisma } = build({ status: TransactionStatus.FAILED });

    await expect(service.markPaid("r1", "pi_1", "cs_1")).resolves.toBe("UNEXPECTED_STATUS");
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it("sin transacción: NOT_FOUND", async () => {
    const { service } = build(null);
    await expect(service.markPaid("r1", "pi_1")).resolves.toBe("NOT_FOUND");
  });
});
