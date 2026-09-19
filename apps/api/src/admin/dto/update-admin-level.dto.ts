import { AdminLevel } from "@mivitrina/shared";
import { IsEnum } from "class-validator";

export class UpdateAdminLevelDto {
  @IsEnum(AdminLevel)
  adminLevel!: AdminLevel;
}
