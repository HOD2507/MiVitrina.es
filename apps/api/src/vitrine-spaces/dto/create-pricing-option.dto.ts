import { IsEnum, IsInt, IsNumber, IsOptional, Min, ValidateIf } from "class-validator";
import { RentalDurationType } from "@mivitrina/shared";

export class CreatePricingOptionDto {
  @IsEnum(RentalDurationType)
  durationType!: RentalDurationType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;

  @ValidateIf((dto: CreatePricingOptionDto) => dto.durationType === RentalDurationType.LIBRE)
  @IsInt()
  @Min(1)
  minDurationDays?: number;
}
