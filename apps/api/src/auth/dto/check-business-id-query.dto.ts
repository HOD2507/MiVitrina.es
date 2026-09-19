import { IsEnum, IsString, MinLength } from "class-validator";
import { Country } from "@mivitrina/shared";

export class CheckBusinessIdQueryDto {
  @IsEnum(Country)
  country!: Country;

  @IsString()
  @MinLength(5)
  businessIdNumber!: string;
}
