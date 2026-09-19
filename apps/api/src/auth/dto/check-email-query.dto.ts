import { IsString, MinLength } from "class-validator";

export class CheckEmailQueryDto {
  @IsString()
  @MinLength(3)
  email!: string;
}
