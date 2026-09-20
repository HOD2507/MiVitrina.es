import { Transform } from "class-transformer";
import { ANNONCEUR_DISPLAY_NAME_MAX_LENGTH, ANNONCEUR_DISPLAY_NAME_MIN_LENGTH, Country, Locale, UserRole } from "@mivitrina/shared";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

/** Refuse un "@" : évite qu'on colle son email dans le champ nom public (ce serait afficher l'email en public). */
export const NO_AT_SIGN = /^[^@]*$/;

/** Rôles ouverts à l'inscription publique — ADMIN en est volontairement exclu. */
export type RegisterableRole = typeof UserRole.ANNONCEUR | typeof UserRole.COMMERCANT;
export const REGISTERABLE_ROLES: RegisterableRole[] = [UserRole.ANNONCEUR, UserRole.COMMERCANT];

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
  @MaxLength(72)
  password!: string;

  @IsIn(REGISTERABLE_ROLES)
  role!: RegisterableRole;

  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @IsEnum(Country)
  country!: Country;

  // --- Champs requis uniquement pour un commerçant ---
  // La vérification d'identité (SIRET/NIF-CIF + justificatif) est
  // manuelle au MVP : le numéro est saisi ici, le document justificatif
  // est uploadé séparément une fois l'espace de stockage branché.
  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.COMMERCANT)
  @IsString()
  @MinLength(2)
  businessName?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.COMMERCANT)
  @IsString()
  @Length(5, 20)
  businessIdNumber?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.COMMERCANT)
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.COMMERCANT)
  @IsString()
  city?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.COMMERCANT)
  @IsString()
  postalCode?: string;

  // --- Champs pour un annonceur ---
  /**
   * Nom public : le SEUL identifiant affiché aux autres utilisateurs
   * (voir getAnnonceurDisplayName) — l'email reste interne. Obligatoire.
   */
  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.ANNONCEUR)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(ANNONCEUR_DISPLAY_NAME_MIN_LENGTH, { message: "Le nom public doit contenir au moins 2 caractères." })
  @MaxLength(ANNONCEUR_DISPLAY_NAME_MAX_LENGTH)
  @Matches(NO_AT_SIGN, { message: "Le nom public ne peut pas contenir de @ (n'utilise pas ton email)." })
  displayName?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.ANNONCEUR)
  @IsOptional()
  @IsString()
  companyName?: string;
}
