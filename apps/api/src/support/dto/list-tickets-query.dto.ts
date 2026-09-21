import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@mivitrina/shared";

/** "ACTIVE" = OPEN + IN_PROGRESS (la vista por defecto de la bandeja); "ALL" = sin filtro de estado. */
export const TICKET_STATUS_FILTERS = ["ACTIVE", "ALL", ...Object.values(SupportTicketStatus)] as const;

export class ListTicketsQueryDto {
  @IsOptional()
  @IsIn(TICKET_STATUS_FILTERS)
  status?: (typeof TICKET_STATUS_FILTERS)[number];

  @IsOptional()
  @IsIn(Object.values(SupportTicketCategory))
  category?: SupportTicketCategory;

  @IsOptional()
  @IsIn(Object.values(SupportTicketPriority))
  priority?: SupportTicketPriority;

  /** "staff" = el último mensaje es del usuario (espera respuesta del equipo). */
  @IsOptional()
  @IsIn(["staff"])
  awaiting?: "staff";

  /** Número de ticket ("#12" o "12"), asunto o email del usuario. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
