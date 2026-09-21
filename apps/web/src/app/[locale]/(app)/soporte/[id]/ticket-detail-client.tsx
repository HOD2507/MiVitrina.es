"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SupportTicketStatus } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import { notifyCountsChanged } from "@/lib/use-count";
import type { SupportThreadMessage, SupportTicketDetail } from "@/lib/types";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TicketStatusBadge } from "@/components/support/ticket-ui";
import { TicketComposer, TicketThread } from "@/components/support/ticket-thread";

const POLL_MS = 8000;

export function TicketDetailClient({ initialTicket }: { initialTicket: SupportTicketDetail }) {
  const t = useTranslations("Support");
  const tCat = useTranslations("Support.category");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const [ticket, setTicket] = useState(initialTicket);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenCount = useRef(initialTicket.messages.length);

  // Al abrirlo la API ya lo marcó leído: se avisa al indicador del menú (el layout pudo calcularlo antes).
  useEffect(() => {
    notifyCountsChanged();
  }, []);

  // Refresco casi en vivo (sin websockets, como el chat), solo con la pestaña visible: leer desde otra
  // pestaña oculta no debe marcar como leídas respuestas que nadie ha visto.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const fresh = await api.get<SupportTicketDetail>(`/support/tickets/${initialTicket.id}`);
        setTicket(fresh);
        notifyCountsChanged();
      } catch {
        // Refresco en segundo plano: un fallo puntual no es bloqueante.
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [initialTicket.id]);

  // Solo se baja al final cuando llega un mensaje NUEVO (no al abrir: quien entra quiere ver la cabecera).
  useEffect(() => {
    if (ticket.messages.length > seenCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    seenCount.current = ticket.messages.length;
  }, [ticket.messages.length]);

  async function sendReply(content: string): Promise<boolean> {
    try {
      const message = await api.post<SupportThreadMessage>(`/support/tickets/${ticket.id}/messages`, { content });
      setTicket((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
        // Responder a un ticket "Resuelto" lo reabre (lo hace la API; se refleja aquí sin esperar al refresco).
        status: prev.status === SupportTicketStatus.RESOLVED ? SupportTicketStatus.OPEN : prev.status,
      }));
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.code === "TICKET_CLOSED") {
        toast.error(t("closedNotice"));
        setTicket((prev) => ({ ...prev, status: SupportTicketStatus.CLOSED }));
      } else {
        toast.error(err instanceof ApiError ? err.message : t("sendError"));
      }
      return false;
    }
  }

  const closed = ticket.status === SupportTicketStatus.CLOSED;
  const resolved = ticket.status === SupportTicketStatus.RESOLVED;

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/soporte" label={t("backToList")} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <span className="text-xs text-muted-foreground">
            {t("ticketNumber", { number: ticket.number })} · {tCat(ticket.category)} ·{" "}
            {new Date(ticket.createdAt).toLocaleDateString(dateLocale, { dateStyle: "medium" })}
          </span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
          {ticket.subject}
        </h1>
      </header>

      {resolved && (
        <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-300">
          {t("resolvedNotice")}
        </p>
      )}

      <Card className="gap-5 p-4 shadow-sm sm:p-6">
        <TicketThread messages={ticket.messages} perspective="user" />
        <div ref={bottomRef} />

        {closed ? (
          <div className="flex flex-col items-start gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">{t("closedNotice")}</p>
            <Button render={<Link href="/soporte" />} className="w-full sm:w-auto">
              {t("openNew")}
            </Button>
          </div>
        ) : (
          <div className="border-t border-border pt-4">
            <TicketComposer
              ariaLabel={t("reply")}
              placeholder={t("replyPlaceholder")}
              submitLabel={t("reply")}
              onSubmit={sendReply}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
