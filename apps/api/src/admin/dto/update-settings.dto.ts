import { IsInt, IsNumber, IsOptional, Max, Min } from "class-validator";

export class UpdateSettingsDto {
  /** Taux de commission, ex: 0.15 = 15%. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeCancellationHours?: number;
}
