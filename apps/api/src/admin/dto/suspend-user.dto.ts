import { IsBoolean, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class SuspendUserDto {
  @IsBoolean()
  suspended!: boolean;

  /** Obligatoire pour suspendre (traçabilité) ; sans objet pour une réactivation. */
  @ValidateIf((dto: SuspendUserDto) => dto.suspended)
  @IsString()
  @MaxLength(500)
  reason?: string;
}
