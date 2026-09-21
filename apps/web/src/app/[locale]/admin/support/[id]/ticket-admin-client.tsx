"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { SupportTicketPriority, SupportTicketStatus, UserRole } from "@mivitrina/shared";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import { notifyCountsChanged } from "@/lib/use-count";
import type { AdminSupportMessage, AdminSupportTicketDetail } from "@/lib/types";
import { BackLink } from "@/components/back-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-ui";
import { TicketComposer, TicketThread } from "@/components/support/ticket-thread";
import { cn } from "cn";

const POLL_MS = 10_000;
type Mode = "reply" | "note";

export function TicketAdminClient({
  initialTicket,
  canViewUser,
}: {
  initialTicket: AdminSupportTicketDetail;
  canViewUser: boolean;
}) {
  const t = useTranslations("Admin.support");
  const tStatus = useTranslations("Support.status");
  const tPriority = useTranslations("Support.priority");
  const tCat = useTranslations("Support.category");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const [ticket, setTicket] = useState(initialTicket);
  const [mode, setMode] = useState<Mode>("reply");
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenCount = useRef(initialTicket.messages.length);

  // Refresco del hilo (el usuario puede haber contestado), solo con la pestaña visible.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const fresh = await api.get<AdminSupportTicketDetail>(`/admin/support/tickets/${initialTicket.id}`);
        setTicket((prev) => ({ ...prev, ...fresh }));
      } catch {
        // Refresco en segundo plano.
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [initialTicket.id]);

  useEffect(() => {
    if (ticket.messages.length > seenCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    seenCount.current = ticket.messages.length;
  }, [ticket.messages.length]);

  async function update(patch: { status?: SupportTicketStatus; priority?: SupportTicketPriority }) {
    setSaving(true);
    try {
      const updated = await api.patch<Pick<AdminSupportTicketDetail, "status" | "priority" | "resolvedAt" | "closedAt">>(
        `/admin/support/tickets/${ticket.id}`,
        patch,
      );
      setTicket((prev) => ({ ...prev, ...updated }));
      toast.success(t("updatedToast"));
      notifyCountsChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  async function send(content: string): Promise<boolean> {
    const internal = mode === "note";
    try {
      const message = await api.post<Omit<AdminSupportMessage, "staffAuthor">>(`/admin/support/tickets/${ticket.id}/messages`, {
        content,
        internal,
      });
      setTicket((prev) => ({
        ...prev,
        messages: [...prev.messages, { ...message, staffAuthor: null }],
        // La primera respuesta pública pasa el ticket a "En curso" (lo hace la API).
        status: !internal && prev.status === SupportTicketStatus.OPEN ? SupportTicketStatus.IN_PROGRESS : prev.status,
      }));
      toast.success(internal ? t("noteSaved") : t("replySent"));
      notifyCountsChanged();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("genericError"));
      return false;
    }
  }

  const closed = ticket.status === SupportTicketStatus.CLOSED;
  const blockedReply = closed && mode === "reply";
  const { user } = ticket;

  const tab = (m: Mode) =>
    cn(
      "inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors sm:flex-none lg:min-h-9",
      mode === m
        ? m === "note"
          ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
          : "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted",
    );

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:py-10">
      <BackLink href="/admin/support" label={t("back")} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <Badge variant="outline">{tCat(ticket.category)}</Badge>
          <span className="text-xs text-muted-foreground">
            #{ticket.number} · {t("openedOn", { date: new Date(ticket.createdAt).toLocaleDateString(dateLocale, { dateStyle: "medium" }) })}
          </span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{ticket.subject}</h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Hilo + respuesta */}
        <Card className="gap-5 p-4 shadow-sm sm:p-6">
          <TicketThread messages={ticket.messages} perspective="staff" otherLabel={user.displayName} />
          <div ref={bottomRef} />

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div role="tablist" className="flex gap-1 rounded-xl bg-muted/50 p-1 sm:w-fit">
              <button type="button" role="tab" aria-selected={mode === "reply"} onClick={() => setMode("reply")} className={tab("reply")}>
                {t("replyTab")}
              </button>
              <button type="button" role="tab" aria-selected={mode === "note"} onClick={() => setMode("note")} className={tab("note")}>
                {t("noteTab")}
              </button>
            </div>

            {blockedReply ? (
              <p role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                {t("closedBlocked")}
              </p>
            ) : (
              <TicketComposer
                key={mode}
                ariaLabel={mode === "note" ? t("noteTab") : t("replyTab")}
                placeholder={mode === "note" ? t("notePlaceholder") : t("replyPlaceholder")}
                submitLabel={mode === "note" ? t("saveNote") : t("sendReply")}
                hint={mode === "reply" ? t("replyHint") : undefined}
                onSubmit={send}
              />
            )}
          </div>
        </Card>

        {/* Estado, usuario y reservas */}
        <div className="flex flex-col gap-5">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("statusLabel")}</Label>
                <Select value={ticket.status} onValueChange={(v) => v && v !== ticket.status && update({ status: v as SupportTicketStatus })} disabled={saving}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string) => tStatus(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SupportTicketStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {tStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("priorityLabel")}</Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(v) => v && v !== ticket.priority && update({ priority: v as SupportTicketPriority })}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string) => tPriority(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SupportTicketPriority).map((p) => (
                      <SelectItem key={p} value={p}>
                        {tPriority(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {saving && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> ...
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("userTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div>
                <p className="font-medium [overflow-wrap:anywhere]">{user.displayName}</p>
                <p className="text-muted-foreground [overflow-wrap:anywhere]">{user.email}</p>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">{t("accountType")}</dt>
                <dd>{user.role === UserRole.ANNONCEUR ? t("roleAnnonceur") : t("roleCommercant")}</dd>
                <dt className="text-muted-foreground">{t("language")}</dt>
                <dd>{user.locale}</dd>
                <dt className="text-muted-foreground">{t("registered")}</dt>
                <dd>{new Date(user.createdAt).toLocaleDateString(dateLocale)}</dd>
              </dl>
              {user.suspended && <Badge variant="destructive" className="self-start">{t("suspended")}</Badge>}
              {canViewUser && (
                <Button variant="outline" size="sm" render={<Link href={`/admin/users/${user.id}`} />} className="w-full">
                  {t("viewUser")}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("reservationsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noReservations")}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {ticket.reservations.map((r) => (
                    <li key={r.id} className="flex flex-col gap-1 py-2.5 text-xs first:pt-0 last:pb-0">
                      <span className="font-medium [overflow-wrap:anywhere]">
                        {r.businessName} · {r.spaceName}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(r.startDate).toLocaleDateString(dateLocale)} → {new Date(r.endDate).toLocaleDateString(dateLocale)}
                        {r.amount !== null && <> · {r.amount.toFixed(2)} €</>}
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">{r.status}</Badge>
                        {r.paymentStatus && <Badge variant="secondary">{r.paymentStatus}</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
