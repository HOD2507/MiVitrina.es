import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateCommercantProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
