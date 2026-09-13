import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from "class-validator";

export class UpdatePricingOptionDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minDurationDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
