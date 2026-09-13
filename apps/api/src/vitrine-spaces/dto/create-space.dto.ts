import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength, ValidateIf } from "class-validator";
import { PosterSizePreset } from "@mivitrina/shared";

export class CreateSpaceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(PosterSizePreset)
  sizePreset!: PosterSizePreset;

  @ValidateIf((dto: CreateSpaceDto) => dto.sizePreset === PosterSizePreset.CUSTOM)
  @IsString()
  @MinLength(1)
  customSizeLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  widthCm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  heightCm?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
