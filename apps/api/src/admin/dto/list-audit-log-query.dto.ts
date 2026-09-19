import { AdminAuditAction } from "@mivitrina/shared";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListAuditLogQueryDto {
  /** Recherche libre sur l'email de l'admin ayant fait l'action. */
  @IsOptional()
  @IsString()
  adminEmail?: string;

  @IsOptional()
  @IsIn(Object.values(AdminAuditAction))
  action?: AdminAuditAction;

  /** Bornes inclusives, format ISO (date seule ou datetime). */
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
