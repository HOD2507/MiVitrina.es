import { IsIn, IsOptional, IsString, ValidateIf } from "class-validator";

export class RespondReservationDto {
  @IsIn(["approve", "reject"])
  action!: "approve" | "reject";

  @ValidateIf((dto: RespondReservationDto) => dto.action === "reject")
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  moderationNote?: string;
}
