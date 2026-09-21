import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { DiscoveryService } from "./discovery.service";

/**
 * Un commerce sans onboarding Stripe terminé ne peut pas encaisser : il ne doit
 * pas apparaître dans "Comercios cerca de ti", et sa fiche doit dire qu'on ne
 * peut pas (encore) y réserver.
 */
describe("DiscoveryService — commerces sans Stripe prêt", () => {
  const storage = {
    getPresignedReadUrl: jest.fn().mockResolvedValue("https://signed"),
    getKeyFromFileUrl: jest.fn((u: string) => u),
  } as unknown as StorageService;

  function profile(overrides: Record<string, unknown> = {}) {
    return {
      id: "cp-1",
      businessName: "Café des Arts",
      description: null,
      addressLine1: "Calle Mayor 1",
      addressLine2: null,
      city: "Madrid",
      postalCode: "28001",
      country: "ES",
      latitude: 40.4,
      longitude: -3.7,
      verificationStatus: "VERIFIED",
      stripeOnboardingComplete: true,
      photos: [],
      spaces: [],
      ...overrides,
    };
  }

  describe("search", () => {
    it("la consulta SQL exige stripeOnboardingComplete = true (en plus de VERIFIED)", async () => {
      const queryRaw = jest.fn().mockResolvedValue([]);
      const service = new DiscoveryService({ $queryRaw: queryRaw } as unknown as PrismaService, storage);

      await expect(service.search(40.4, -3.7, 10)).resolves.toEqual([]);

      const sql = queryRaw.mock.calls[0][0] as { strings: string[] };
      const text = sql.strings.join("?");
      expect(text).toContain(`cp."stripeOnboardingComplete" = true`);
      expect(text).toContain(`cp."verificationStatus"`);
    });
  });

  describe("getPublicProfile", () => {
    const build = (p: unknown) =>
      new DiscoveryService({ commercantProfile: { findUnique: jest.fn().mockResolvedValue(p) } } as unknown as PrismaService, storage);

    it("Stripe listo → bookable: true", async () => {
      const result = await build(profile()).getPublicProfile("cp-1");
      expect(result.bookable).toBe(true);
    });

    it("Stripe sin terminar → la ficha SÍ se devuelve (no 404) con bookable: false y sus espacios", async () => {
      const space = { id: "s1", name: "Escaparate", photos: [], pricingOptions: [] };
      const result = await build(profile({ stripeOnboardingComplete: false, spaces: [space] })).getPublicProfile("cp-1");

      expect(result.bookable).toBe(false);
      expect(result.spaces).toHaveLength(1);
    });

    it("comercio no verificado sigue dando 404, tenga o no Stripe", async () => {
      await expect(build(profile({ verificationStatus: "PENDING" })).getPublicProfile("cp-1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
