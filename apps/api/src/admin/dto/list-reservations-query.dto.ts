import { IsIn, IsOptional, IsString } from "class-validator";
import { ReservationStatus } from "@mivitrina/shared";

export class ListReservationsQueryDto {
  @IsOptional()
  @IsIn(Object.values(ReservationStatus))
  status?: ReservationStatus;

  /** Recherche libre : nom du commerce ou de l'annonceur/société. */
  @IsOptional()
  @IsString()
  search?: string;
}
