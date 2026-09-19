import { IsOptional, IsString, MaxLength } from "class-validator";

/** Champs de compte modifiables depuis "Ajustes" — distincts du profil
 * métier (businessName, companyName...), qui ont leurs propres endpoints. */
export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
