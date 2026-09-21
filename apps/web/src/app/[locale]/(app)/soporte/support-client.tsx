"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { LifeBuoy, Loader2, Plus } from "lucide-react";
import { SUPPORT_LIMITS, SupportTicketCategory } from "@mivitrina/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import type { SupportTicketSummary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { TicketStatusBadge } from "@/components/support/ticket-ui";

export function SupportClient({ initialTickets }: { initialTickets: SupportTicketSummary[] }) {
  const t = useTranslations("Support");
  const tCat = useTranslations("Support.category");
  const locale = useLocale();
  const router = useRouter();
  const dateLocale = getDateLocale(locale);

  // Sin solicitudes previas, el formulario ya se ve abierto: es lo único que puede querer hacer aquí.
  const [showForm, setShowForm] = useState(initialTickets.length === 0);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>(SupportTicketCategory.OTHER);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    subject.trim().length >= SUPPORT_LIMITS.SUBJECT_MIN && message.trim().length >= SUPPORT_LIMITS.MESSAGE_MIN && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const ticket = await api.post<SupportTicketSummary>("/support/tickets", {
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
      toast.success(t("createdToast"));
      router.push(`/soporte/${ticket.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "TOO_MANY_ACTIVE_TICKETS") {
        toast.error(t("tooManyActive"));
      } else {
        toast.error(err instanceof ApiError ? err.message : t("createError"));
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {showForm ? (
        <Card className="p-4 shadow-sm sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-subject">{t("subjectLabel")}</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("subjectPlaceholder")}
                maxLength={SUPPORT_LIMITS.SUBJECT_MAX}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("categoryLabel")}</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v as SupportTicketCategory)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue>{(v: string) => tCat(v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SupportTicketCategory).map((c) => (
                    <SelectItem key={c} value={c}>
                      {tCat(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-message">{t("messageLabel")}</Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePlaceholder")}
                maxLength={SUPPORT_LIMITS.MESSAGE_MAX}
                rows={5}
                required
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {initialTickets.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={submitting}>
                  {t("cancel")}
                </Button>
              )}
              <Button type="submit" disabled={!canSubmit}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {t("send")}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button className="w-full self-start sm:w-auto" onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          {t("newRequest")}
        </Button>
      )}

      <section aria-labelledby="my-requests" className="flex flex-col gap-3">
        <h2 id="my-requests" className="font-heading text-xl font-semibold tracking-tight">
          {t("myRequests")}
        </h2>

        {initialTickets.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <EmptyState icon={LifeBuoy} title={t("emptyTitle")} description={t("emptyDesc")} className="py-10" />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {initialTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/soporte/${ticket.id}`}
                  className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium [overflow-wrap:anywhere]">{ticket.subject}</p>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <TicketStatusBadge status={ticket.status} />
                      {ticket.unread && <Badge>{t("newReply")}</Badge>}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    #{ticket.number} · {tCat(ticket.category)} ·{" "}
                    {t("lastActivity", {
                      date: new Date(ticket.lastMessageAt).toLocaleDateString(dateLocale, { dateStyle: "medium" }),
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
