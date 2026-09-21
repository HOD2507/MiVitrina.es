"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Inbox, Loader2, Search } from "lucide-react";
import { SupportTicketCategory, SupportTicketStatus, UserRole } from "@mivitrina/shared";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import type { AdminSupportInbox } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconInput } from "@/components/ui/icon-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-ui";
import { cn } from "cn";

type Tab = "ACTIVE" | "ALL" | SupportTicketStatus;
type CategoryFilter = "ALL" | SupportTicketCategory;

const TABS: Tab[] = ["ACTIVE", SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED, "ALL"];

export function SupportInboxClient({ initialInbox }: { initialInbox: AdminSupportInbox }) {
  const t = useTranslations("Admin.support");
  const tStatus = useTranslations("Support.status");
  const tCat = useTranslations("Support.category");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const [inbox, setInbox] = useState(initialInbox);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [search, setSearch] = useState("");
  const [awaiting, setAwaiting] = useState(false);
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("status", tab);
    if (category !== "ALL") params.set("category", category);
    if (awaiting) params.set("awaiting", "staff");
    if (urgent) params.set("priority", "URGENT");
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        setInbox(await api.get<AdminSupportInbox>(`/admin/support/tickets?${params.toString()}`));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("loadError"));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category, search, awaiting, urgent]);

  const { counts } = inbox;
  const tabCount = (k: Tab): number =>
    k === "ACTIVE"
      ? counts.OPEN + counts.IN_PROGRESS
      : k === "ALL"
        ? counts.OPEN + counts.IN_PROGRESS + counts.RESOLVED + counts.CLOSED
        : counts[k];
  const tabLabel = (k: Tab) => (k === "ACTIVE" ? t("tabActive") : k === "ALL" ? t("tabAll") : tStatus(k));
  const roleLabel = (r: string) => (r === UserRole.ANNONCEUR ? t("roleAnnonceur") : t("roleCommercant"));

  const toggle = (on: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors lg:min-h-9",
      on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
    );

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:py-10">
      <Reveal>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </Reveal>

      {/* Pestañas de estado: en móvil se desplazan en horizontal en vez de partirse en varias líneas. */}
      <Reveal delay={60}>
        <div role="tablist" className="scroll-shadows-x -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {TABS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={toggle(tab === k)}
            >
              {tabLabel(k)}
              <span className="ml-1.5 text-xs opacity-70">{tabCount(k)}</span>
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <IconInput
            icon={Search}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-sm"
          />
          <Select value={category} onValueChange={(v) => v && setCategory(v as CategoryFilter)}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue>{(v: string) => (v === "ALL" ? t("filterCategoryAll") : tCat(v))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filterCategoryAll")}</SelectItem>
              {Object.values(SupportTicketCategory).map((c) => (
                <SelectItem key={c} value={c}>
                  {tCat(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={awaiting} onClick={() => setAwaiting((v) => !v)} className={toggle(awaiting)}>
              {t("awaitingOnly")}
            </button>
            <button type="button" aria-pressed={urgent} onClick={() => setUrgent((v) => !v)} className={toggle(urgent)}>
              {t("urgentOnly")}
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <Card className="overflow-hidden p-0 shadow-sm">
          {loading && (
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> ...
            </div>
          )}
          {inbox.tickets.length === 0 ? (
            <EmptyState icon={Inbox} title={t("emptyTitle")} description={t("emptyDesc")} className="py-12" />
          ) : (
            <ul className="divide-y divide-border">
              {inbox.tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/admin/support/${ticket.id}`}
                    className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="flex items-start gap-2 font-medium">
                        {ticket.awaitingStaff && (
                          <span
                            title={t("awaitingBadge")}
                            aria-label={t("awaitingBadge")}
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                          />
                        )}
                        <span className="[overflow-wrap:anywhere]">
                          <span className="text-muted-foreground">#{ticket.number}</span> {ticket.subject}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        {ticket.user.displayName} · {roleLabel(ticket.user.role)} · {ticket.user.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <Badge variant="outline">{tCat(ticket.category)}</Badge>
                      <TicketStatusBadge status={ticket.status} />
                      <time dateTime={ticket.lastMessageAt} className="text-xs text-muted-foreground sm:ml-2 sm:w-24 sm:text-right">
                        {new Date(ticket.lastMessageAt).toLocaleDateString(dateLocale, { dateStyle: "medium" })}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
