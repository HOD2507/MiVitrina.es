"use client";

import { useTranslations } from "next-intl";
import type { SupportTicketPriority, SupportTicketStatus } from "@mivitrina/shared";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<SupportTicketStatus, "warning" | "default" | "success" | "secondary"> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CLOSED: "secondary",
};

/** Estado del ticket con el mismo color en la vista del usuario y en la del equipo. */
export function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  const t = useTranslations("Support.status");
  return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}

/** Solo se marca la excepción: "Normal" no necesita etiqueta. */
export function TicketPriorityBadge({ priority }: { priority: SupportTicketPriority }) {
  const t = useTranslations("Support.priority");
  if (priority !== "URGENT") return null;
  return <Badge variant="destructive">{t(priority)}</Badge>;
}
