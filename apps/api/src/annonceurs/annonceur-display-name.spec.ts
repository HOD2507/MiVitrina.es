import { getAnnonceurDisplayName } from "@mivitrina/shared";

describe("getAnnonceurDisplayName", () => {
  it("préfère le nom public", () => {
    expect(getAnnonceurDisplayName({ displayName: "Hani", companyName: "AgencePub SL" })).toBe("Hani");
  });

  it("ignore un nom public vide ou fait d'espaces", () => {
    expect(getAnnonceurDisplayName({ displayName: "   ", companyName: "AgencePub SL" })).toBe("AgencePub SL");
  });

  it("retombe sur la raison sociale quand il n'y a pas de nom public (comptes antérieurs)", () => {
    expect(getAnnonceurDisplayName({ displayName: null, companyName: "AgencePub SL" })).toBe("AgencePub SL");
  });

  it("retombe sur un libellé générique localisé, sans profil ou sans aucun nom", () => {
    expect(getAnnonceurDisplayName(null)).toBe("Anunciante");
    expect(getAnnonceurDisplayName(undefined, "en")).toBe("Advertiser");
    expect(getAnnonceurDisplayName({ displayName: null, companyName: null }, "EN")).toBe("Advertiser");
    // Tags BCP-47 (le web passe parfois "en-GB" / "es-ES").
    expect(getAnnonceurDisplayName({}, "en-GB")).toBe("Advertiser");
    expect(getAnnonceurDisplayName({}, "es-ES")).toBe("Anunciante");
    // Langue inconnue : espagnol, la langue par défaut de la plateforme.
    expect(getAnnonceurDisplayName({}, "fr")).toBe("Anunciante");
  });
});
