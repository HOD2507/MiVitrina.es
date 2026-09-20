import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ANNONCEUR_DISPLAY_NAME_MAX_LENGTH, ANNONCEUR_DISPLAY_NAME_MIN_LENGTH } from "@mivitrina/shared";
import { NO_AT_SIGN } from "./register.dto";

/** Champs de compte modifiables depuis "Ajustes" — distincts du profil
 * métier (businessName, companyName...), qui ont leurs propres endpoints. */
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /**
   * Nom public d'un annonceur (ignoré pour les autres rôles). Permet aux
   * comptes créés avant l'existence du champ, ou via Google sans prénom,
   * d'en choisir un. Voir RegisterDto.displayName.
   */
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(ANNONCEUR_DISPLAY_NAME_MIN_LENGTH, { message: "Le nom public doit contenir au moins 2 caractères." })
  @MaxLength(ANNONCEUR_DISPLAY_NAME_MAX_LENGTH)
  @Matches(NO_AT_SIGN, { message: "Le nom public ne peut pas contenir de @ (n'utilise pas ton email)." })
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
