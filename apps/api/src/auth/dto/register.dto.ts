import { Country, Locale, UserRole } from "@mivitrina/shared";
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Length, MaxLength, MinLength, ValidateIf } from "class-validator";

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

  // --- Champ optionnel pour un annonceur ---
  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.ANNONCEUR)
  @IsOptional()
  @IsString()
  companyName?: string;
}
