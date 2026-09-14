import { moderateChatMessage } from "./chat-moderation";

describe("moderateChatMessage", () => {
  it("laisse passer un message normal sans le modifier", () => {
    const result = moderateChatMessage("Bonjour, l'affiche est bien arrivée, merci !");
    expect(result.flagged).toBe(false);
    expect(result.flagReason).toBeNull();
    expect(result.content).toBe("Bonjour, l'affiche est bien arrivée, merci !");
  });

  it("masque une adresse email et flague le message", () => {
    const result = moderateChatMessage("Contactez-moi plutôt sur jean.dupont@example.com");
    expect(result.flagged).toBe(true);
    expect(result.content).not.toContain("jean.dupont@example.com");
    expect(result.content).toContain("[coordonnées masquées]");
    expect(result.flagReason).toContain("email");
  });

  it("masque un numéro de téléphone français", () => {
    const result = moderateChatMessage("Appelez-moi au 06 12 34 56 78 directement.");
    expect(result.flagged).toBe(true);
    expect(result.content).not.toContain("06 12 34 56 78");
    expect(result.content).toContain("[numéro masqué]");
    expect(result.flagReason).toContain("téléphone");
  });

  it("masque un lien externe", () => {
    const result = moderateChatMessage("Retrouvez-moi sur https://mon-site-perso.com/contact");
    expect(result.flagged).toBe(true);
    expect(result.content).not.toContain("https://mon-site-perso.com/contact");
    expect(result.flagReason).toContain("lien");
  });

  it("cumule plusieurs raisons si plusieurs coordonnées sont présentes", () => {
    const result = moderateChatMessage("Email: test@test.com ou tel: 06 11 22 33 44");
    expect(result.flagged).toBe(true);
    expect(result.flagReason).toContain("email");
    expect(result.flagReason).toContain("téléphone");
  });
});
