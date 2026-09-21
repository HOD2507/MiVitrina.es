import { IsIn, IsOptional } from "class-validator";
import { SupportTicketPriority, SupportTicketStatus } from "@mivitrina/shared";

export class UpdateTicketDto {
  @IsOptional()
  @IsIn(Object.values(SupportTicketStatus))
  status?: SupportTicketStatus;

  @IsOptional()
  @IsIn(Object.values(SupportTicketPriority))
  priority?: SupportTicketPriority;
}
