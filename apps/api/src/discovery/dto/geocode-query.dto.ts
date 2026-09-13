import { IsString, MinLength } from "class-validator";

export class GeocodeQueryDto {
  @IsString()
  @MinLength(3)
  q!: string;
}
