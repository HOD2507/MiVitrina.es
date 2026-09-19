import { AdminLevel } from "@mivitrina/shared";
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from "class-validator";

export class CreateAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
  @MaxLength(72)
  password!: string;

  /** Périmètre attribué au nouveau compte — voir ADMIN_PERMISSIONS dans @mivitrina/shared. */
  @IsEnum(AdminLevel)
  adminLevel!: AdminLevel;
}
