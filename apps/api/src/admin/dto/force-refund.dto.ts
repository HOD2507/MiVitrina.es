import { IsNumber, IsString, Min, MinLength } from "class-validator";

export class ForceRefundDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  /** Obligatoire — traçabilité d'un mouvement d'argent forcé par l'admin. */
  @IsString()
  @MinLength(1)
  reason!: string;
}
