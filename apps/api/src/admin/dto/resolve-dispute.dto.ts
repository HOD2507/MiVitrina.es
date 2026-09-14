import { IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";
import { ReservationStatus } from "@mivitrina/shared";

/** États plausibles pour une réservation après arbitrage d'un litige. */
const ALLOWED_NEXT_STATUSES = [
  ReservationStatus.ACTIVE,
  ReservationStatus.COMPLETED,
  ReservationStatus.CANCELLED_BY_COMMERCANT,
] as const;

export class ResolveDisputeDto {
  @IsString()
  @MinLength(1)
  resolution!: string;

  /** RESOLVED = réclamation traitée/actée ; REJECTED = litige jugé non fondé. */
  @IsIn(["RESOLVED", "REJECTED"])
  outcome!: "RESOLVED" | "REJECTED";

  /** Montant à rembourser à l'annonceur (euros), le cas échéant. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  refundAmount?: number;

  @IsIn(ALLOWED_NEXT_STATUSES)
  nextStatus!: (typeof ALLOWED_NEXT_STATUSES)[number];
}
