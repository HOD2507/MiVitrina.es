import { IsIn, IsString, MaxLength, MinLength } from "class-validator";
import { SUPPORT_LIMITS, SupportTicketCategory } from "@mivitrina/shared";
import { Trim } from "./trim";

export class CreateTicketDto {
  @Trim()
  @IsString()
  @MinLength(SUPPORT_LIMITS.SUBJECT_MIN)
  @MaxLength(SUPPORT_LIMITS.SUBJECT_MAX)
  subject!: string;

  @IsIn(Object.values(SupportTicketCategory))
  category!: SupportTicketCategory;

  @Trim()
  @IsString()
  @MinLength(SUPPORT_LIMITS.MESSAGE_MIN)
  @MaxLength(SUPPORT_LIMITS.MESSAGE_MAX)
  message!: string;
}
