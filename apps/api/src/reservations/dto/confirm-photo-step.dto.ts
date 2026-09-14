import { IsIn, IsString, ValidateIf } from "class-validator";

/** Réponse de l'annonceur à une photo de pose/retrait envoyée par le commerçant. */
export class ConfirmPhotoStepDto {
  @IsIn(["confirm", "dispute"])
  action!: "confirm" | "dispute";

  @ValidateIf((dto: ConfirmPhotoStepDto) => dto.action === "dispute")
  @IsString()
  reason?: string;
}
