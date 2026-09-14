import { IsIn, IsOptional, IsString, ValidateIf } from "class-validator";

export class ReviewVerificationDto {
  @IsIn(["approve", "reject"])
  action!: "approve" | "reject";

  /** Obligatoire pour un refus (l'annonceur/commerçant doit savoir pourquoi) ; libre pour une approbation. */
  @ValidateIf((dto: ReviewVerificationDto) => dto.action === "reject")
  @IsString()
  note?: string;
}
