import { IsOptional, IsString } from "class-validator";

export class CreateThreadDto {
  @IsString()
  commercantProfileId!: string;

  @IsOptional()
  @IsString()
  reservationId?: string;
}
