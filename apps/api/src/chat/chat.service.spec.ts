import { PrismaService } from "../prisma/prisma.service";
import { ChatService } from "./chat.service";

/**
 * Le commerçant doit voir l'annonceur par son NOM PUBLIC, jamais par son
 * email : l'email est une donnée interne (et le montrer facilite de sortir
 * la conversation de la plateforme, ce que le chat modéré cherche à éviter).
 */
describe("ChatService.listThreads — identité de l'annonceur", () => {
  const COMMERCANT_USER_ID = "user-commercant";
  const ANNONCEUR_EMAIL = "hani.oulh25@gmail.com";

  function buildService(annonceurProfile: { displayName: string | null; companyName: string | null }, locale = "ES") {
    const prisma = {
      commercantProfile: { findUnique: jest.fn().mockResolvedValue({ id: "cp-1", userId: COMMERCANT_USER_ID }) },
      annonceurProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      user: { findUnique: jest.fn().mockResolvedValue({ locale }) },
      chatThread: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "thread-1",
            commercantProfile: { userId: COMMERCANT_USER_ID, businessName: "Laverie du Marais" },
            annonceurProfile,
            messages: [],
            _count: { messages: 0 },
            updatedAt: new Date("2026-09-20T10:00:00Z"),
          },
        ]),
      },
    };
    return { service: new ChatService(prisma as unknown as PrismaService), prisma };
  }

  it("affiche le nom public de l'annonceur", async () => {
    const { service } = buildService({ displayName: "Hani", companyName: "AgencePub SL" });

    const [thread] = await service.listThreads(COMMERCANT_USER_ID);

    expect(thread.otherPartyName).toBe("Hani");
  });

  it("retombe sur la raison sociale puis sur un libellé générique — jamais sur l'email", async () => {
    const withCompany = await buildService({ displayName: null, companyName: "AgencePub SL" }).service.listThreads(
      COMMERCANT_USER_ID,
    );
    expect(withCompany[0].otherPartyName).toBe("AgencePub SL");

    const anonymous = await buildService({ displayName: null, companyName: null }).service.listThreads(
      COMMERCANT_USER_ID,
    );
    expect(anonymous[0].otherPartyName).toBe("Anunciante");
    expect(anonymous[0].otherPartyName).not.toContain("@");
  });

  it("localise le libellé générique selon la langue de la personne qui consulte", async () => {
    const [thread] = await buildService({ displayName: null, companyName: null }, "EN").service.listThreads(
      COMMERCANT_USER_ID,
    );

    expect(thread.otherPartyName).toBe("Advertiser");
  });

  it("ne demande jamais l'email de l'annonceur à la base", async () => {
    const { service, prisma } = buildService({ displayName: "Hani", companyName: null });

    await service.listThreads(COMMERCANT_USER_ID);

    const query = JSON.stringify(prisma.chatThread.findMany.mock.calls[0][0]);
    expect(query).not.toContain("email");
    expect(query).not.toContain(ANNONCEUR_EMAIL);
  });
});
