import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateReservationDto {
  @IsString()
  spaceId!: string;

  @IsString()
  pricingOptionId!: string;

  @IsDateString()
  startDate!: string;

  /** Requis uniquement si la durée du tarif choisi est LIBRE. */
  @IsOptional()
  @IsInt()
  @Min(1)
  customDurationDays?: number;
}
