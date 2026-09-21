import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { SUPPORT_LIMITS } from "@mivitrina/shared";
import { Trim } from "./trim";

/** Respuesta del usuario en su propio ticket. */
export class ReplyTicketDto {
  @Trim()
  @IsString()
  @MinLength(SUPPORT_LIMITS.MESSAGE_MIN)
  @MaxLength(SUPPORT_LIMITS.MESSAGE_MAX)
  content!: string;
}

/** Respuesta del equipo; `internal: true` = nota interna, invisible para el usuario y sin aviso por email. */
export class StaffReplyDto extends ReplyTicketDto {
  @IsOptional()
  @IsBoolean()
  internal?: boolean;
}
