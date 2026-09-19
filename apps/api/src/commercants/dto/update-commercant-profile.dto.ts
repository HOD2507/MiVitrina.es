import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Tous les champs sont optionnels : le commerçant peut ne changer que la
 * description, ou seulement le nom, ou seulement l'adresse. Le contrôleur
 * ne re-géocode que si une des trois parties de l'adresse est fournie
 * (voir CommercantsController.updateProfile) — corrige un vrai trou
 * fonctionnel : jusqu'ici, une erreur de frappe dans le nom ou l'adresse
 * saisis à l'inscription était irrécupérable (aucun endpoint ne les
 * touchait après coup, contrairement à `description`).
 */
export class UpdateCommercantProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}
