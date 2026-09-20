import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RegisterDto } from "./register.dto";
import { UpdateAccountDto } from "./update-account.dto";

const baseAnnonceur = { email: "pub@example.com", password: "MotDePasse123", role: "ANNONCEUR", country: "ES" };

async function errorsFor<T extends object>(cls: new () => T, plain: Record<string, unknown>) {
  const errors = await validate(plainToInstance(cls, plain));
  return errors.map((e) => e.property);
}

describe("RegisterDto — nom public de l'annonceur", () => {
  it("l'exige pour un annonceur", async () => {
    expect(await errorsFor(RegisterDto, baseAnnonceur)).toContain("displayName");
  });

  it("accepte un nom valide (et le nettoie des espaces autour)", async () => {
    const dto = plainToInstance(RegisterDto, { ...baseAnnonceur, displayName: "  Hani  " });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.displayName).toBe("Hani");
  });

  it("refuse un nom trop court, trop long ou fait uniquement d'espaces", async () => {
    expect(await errorsFor(RegisterDto, { ...baseAnnonceur, displayName: "H" })).toContain("displayName");
    expect(await errorsFor(RegisterDto, { ...baseAnnonceur, displayName: "x".repeat(51) })).toContain("displayName");
    expect(await errorsFor(RegisterDto, { ...baseAnnonceur, displayName: "     " })).toContain("displayName");
  });

  it("refuse un nom contenant @ : on ne colle pas son email comme identité publique", async () => {
    expect(await errorsFor(RegisterDto, { ...baseAnnonceur, displayName: "hani.oulh25@gmail.com" })).toContain(
      "displayName",
    );
  });

  it("ne l'exige pas pour un commerçant", async () => {
    const commercant = {
      email: "shop@example.com",
      password: "MotDePasse123",
      role: "COMMERCANT",
      country: "ES",
      businessName: "Laverie",
      businessIdNumber: "B12345674",
      addressLine1: "Calle Mayor 1",
      city: "Madrid",
      postalCode: "28001",
    };

    expect(await errorsFor(RegisterDto, commercant)).not.toContain("displayName");
  });
});

describe("UpdateAccountDto — nom public (Ajustes)", () => {
  it("est optionnel : modifier seulement le téléphone reste possible", async () => {
    expect(await errorsFor(UpdateAccountDto, { phone: "600000000" })).toHaveLength(0);
  });

  it("applique les mêmes règles qu'à l'inscription", async () => {
    expect(await errorsFor(UpdateAccountDto, { displayName: "Hani" })).toHaveLength(0);
    expect(await errorsFor(UpdateAccountDto, { displayName: "a@b.com" })).toContain("displayName");
    expect(await errorsFor(UpdateAccountDto, { displayName: "H" })).toContain("displayName");
  });
});
