"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { Search, ScrollText, Loader2 } from "lucide-react";
import { AdminAuditAction } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import type { AuditLogEntry } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconInput } from "@/components/ui/icon-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";

type ActionFilter = "ALL" | AdminAuditAction;

/** Étiquette + ton par type d'action — la clé miroir exactement la chaîne stockée en base (ex. "user.suspend"), qui a la même forme imbriquée dans les messages i18n (voir Admin.auditLog.actions). */
const ACTION_TONE: Record<AdminAuditAction, "default" | "destructive" | "warning" | "success" | "outline"> = {
  [AdminAuditAction.USER_SUSPEND]: "warning",
  [AdminAuditAction.USER_UNSUSPEND]: "success",
  [AdminAuditAction.USER_DELETE]: "destructive",
  [AdminAuditAction.VERIFICATION_REVIEW]: "outline",
  [AdminAuditAction.ADMIN_CREATE]: "default",
  [AdminAuditAction.ADMIN_UPDATE_LEVEL]: "outline",
  [AdminAuditAction.ADMIN_DELETE]: "destructive",
  [AdminAuditAction.RESERVATION_FORCE_REFUND]: "warning",
  [AdminAuditAction.DISPUTE_RESOLVE]: "outline",
  [AdminAuditAction.SETTINGS_UPDATE]: "outline",
  [AdminAuditAction.POSTER_APPROVE]: "success",
  [AdminAuditAction.POSTER_REJECT]: "destructive",
  [AdminAuditAction.POSTER_DELETE]: "destructive",
};

const TARGET_TYPE_KEY: Record<string, string> = {
  user: "targetTypeUser",
  reservation: "targetTypeReservation",
  dispute: "targetTypeDispute",
  commercant_profile: "targetTypeCommercantProfile",
  platform_settings: "targetTypePlatformSettings",
};

/** Résume les champs pertinents de `metadata` en une phrase lisible — le détail varie par type d'action (voir AdminService.logAction, côté API). */
function describeMetadata(entry: AuditLogEntry, t: ReturnType<typeof useTranslations>): string | null {
  const m = entry.metadata;
  if (!m) return null;

  switch (entry.action) {
    case AdminAuditAction.USER_SUSPEND:
      return typeof m.reason === "string" ? m.reason : null;
    case AdminAuditAction.VERIFICATION_REVIEW: {
      const outcome = m.action === "approve" ? t("verificationApproved") : t("verificationRejected");
      return typeof m.note === "string" && m.note ? `${outcome} — ${m.note}` : outcome;
    }
    case AdminAuditAction.ADMIN_CREATE:
      return typeof m.adminLevel === "string" ? t("assignedLevel", { level: t(`level.${m.adminLevel}`) }) : null;
    case AdminAuditAction.ADMIN_UPDATE_LEVEL:
      return typeof m.previousLevel === "string" && typeof m.newLevel === "string"
        ? `${t(`level.${m.previousLevel}`)} → ${t(`level.${m.newLevel}`)}`
        : null;
    case AdminAuditAction.ADMIN_DELETE:
      return typeof m.adminLevel === "string" ? t("assignedLevel", { level: t(`level.${m.adminLevel}`) }) : null;
    case AdminAuditAction.RESERVATION_FORCE_REFUND:
      return typeof m.amount === "number" && typeof m.reason === "string"
        ? `${m.amount.toFixed(2)} € — ${m.reason}`
        : null;
    case AdminAuditAction.DISPUTE_RESOLVE: {
      const parts: string[] = [];
      if (typeof m.resolution === "string") parts.push(m.resolution);
      if (typeof m.refundAmount === "number") parts.push(`${m.refundAmount.toFixed(2)} €`);
      return parts.length ? parts.join(" — ") : null;
    }
    case AdminAuditAction.SETTINGS_UPDATE: {
      const before = m.before as Record<string, unknown> | undefined;
      const after = m.after as Record<string, unknown> | undefined;
      const parts: string[] = [];
      if (after && "commissionRate" in after && before) {
        parts.push(`${t("commission")} ${(Number(before.commissionRate) * 100).toFixed(1)}% → ${(Number(after.commissionRate) * 100).toFixed(1)}%`);
      }
      if (after && "freeCancellationHours" in after && before) {
        parts.push(`${t("freeCancellation")} ${before.freeCancellationHours}h → ${after.freeCancellationHours}h`);
      }
      return parts.length ? parts.join(" · ") : null;
    }
    default:
      return null;
  }
}

export function AuditLogClient({ initialEntries }: { initialEntries: AuditLogEntry[] }) {
  const t = useTranslations("Admin.auditLog");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const [entries, setEntries] = useState(initialEntries);
  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [action, setAction] = useState<ActionFilter>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (adminEmail.trim()) params.set("adminEmail", adminEmail.trim());
    if (action !== "ALL") params.set("action", action);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        setEntries(await api.get<AuditLogEntry[]>(`/admin/audit-log?${params.toString()}`));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("loadError"));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEmail, action, from, to]);

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <h1 className="flex items-center gap-2.5 font-heading text-4xl font-extrabold tracking-tight">
            <ScrollText className="size-8 text-primary" />
            {t("title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        {/* Toutes les colonnes partagent la même structure label+champ (même
            quand le label est visuellement masqué) pour que leurs champs
            s'alignent verticalement entre eux — sans ça, "Desde"/"Hasta"
            (avec label) paraissaient décalés vers le bas par rapport à la
            recherche/l'action (sans label), retour utilisateur explicite. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <Label htmlFor="admin-search" className="text-xs text-muted-foreground">
                {t("tableAdmin")}
              </Label>
              <IconInput
                id="admin-search"
                icon={Search}
                placeholder={t("searchPlaceholder")}
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="sm:w-64"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="action-filter" className="text-xs text-muted-foreground">
                {t("tableAction")}
              </Label>
              <Select value={action} onValueChange={(v) => v && setAction(v as ActionFilter)}>
                <SelectTrigger id="action-filter" className="w-full sm:w-64">
                  <SelectValue>{(v: string) => (v === "ALL" ? t("filterActionAll") : t(`actions.${v}`))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filterActionAll")}</SelectItem>
                  {Object.values(AdminAuditAction).map((a) => (
                    <SelectItem key={a} value={a}>
                      {t(`actions.${a}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Les deux dates se partagent la largeur sur mobile (w-40 ×2 ne tenait pas dans 320px). */}
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
              <Label htmlFor="from" className="text-xs text-muted-foreground">
                {t("fromLabel")}
              </Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-40" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
              <Label htmlFor="to" className="text-xs text-muted-foreground">
                {t("toLabel")}
              </Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-40" />
            </div>
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
          {entries.length === 0 ? (
            <EmptyState icon={ScrollText} title={t("emptyTitle")} className="py-12" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{t("tableDate")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableAdmin")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableAction")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableTarget")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableReason")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => {
                    const reason = describeMetadata(entry, t);
                    return (
                      <tr key={entry.id} className="align-top transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString(dateLocale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium">{entry.adminEmail}</td>
                        <td className="px-4 py-3">
                          <Badge variant={ACTION_TONE[entry.action as AdminAuditAction] ?? "outline"}>
                            {t(`actions.${entry.action}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div>{entry.targetLabel ?? entry.targetId}</div>
                          {TARGET_TYPE_KEY[entry.targetType] && (
                            <div className="text-xs text-muted-foreground">{t(TARGET_TYPE_KEY[entry.targetType])}</div>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-muted-foreground">{reason ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
