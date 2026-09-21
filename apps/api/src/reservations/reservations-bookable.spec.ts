import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { StripeService } from "../stripe/stripe.service";
import { MERCHANT_NOT_BOOKABLE_CODE } from "../commercants/booking-availability";
import { ReservationsService } from "./reservations.service";

/** Reservar en un comercio sin Stripe terminado debe bloquearse en el servidor (barrera real, no solo la UI). */
describe("ReservationsService.create — comercio sin Stripe listo", () => {
  function build(stripeOnboardingComplete: boolean) {
    const prisma = {
      annonceurProfile: { findUnique: jest.fn().mockResolvedValue({ id: "ap-1" }) },
      pricingOption: {
        findUnique: jest.fn().mockResolvedValue({
          id: "po-1",
          spaceId: "s-1",
          isActive: true,
          durationType: "SEMAINE",
          price: 20,
          space: { isActive: true, commercantProfile: { verificationStatus: "VERIFIED", stripeOnboardingComplete } },
        }),
      },
      reservation: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "r-1" }) },
      platformSettings: { upsert: jest.fn().mockResolvedValue({ commissionRate: 0.15 }) },
    };
    const service = new ReservationsService(prisma as unknown as PrismaService, {} as StorageService, {} as StripeService);
    return { service, prisma };
  }
  const dto = { spaceId: "s-1", pricingOptionId: "po-1", startDate: new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10) };

  it("sin onboarding: 400 con código MERCHANT_NOT_BOOKABLE y no se crea ninguna reserva", async () => {
    const { service, prisma } = build(false);

    const error = await service.create("user-1", dto).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({ code: MERCHANT_NOT_BOOKABLE_CODE });
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });

  it("con onboarding completo: la reserva se crea con normalidad", async () => {
    const { service, prisma } = build(true);

    await expect(service.create("user-1", dto)).resolves.toEqual({ id: "r-1" });
    expect(prisma.reservation.create).toHaveBeenCalledTimes(1);
  });
});
