"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { Search, Loader2, Undo2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import type { AdminReservationListItem } from "@/lib/types";
import { ReservationStatus, TransactionStatus } from "@mivitrina/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/icon-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { AdvertiserIdentity } from "@/components/admin-advertiser-identity";
import { Reveal } from "@/components/reveal";

const STATUS_VARIANT: Record<ReservationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING_VALIDATION: "outline",
  CONFIRMED: "default",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED_BY_ANNONCEUR: "destructive",
  CANCELLED_BY_COMMERCANT: "destructive",
  NO_SHOW: "destructive",
  DISPUTE: "destructive",
};

export function AdminReservationsClient({ initialReservations }: { initialReservations: AdminReservationListItem[] }) {
  const t = useTranslations("Admin.reservations");
  const tReservations = useTranslations("Reservations");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const [reservations, setReservations] = useState(initialReservations);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ReservationStatus>("ALL");

  const [refundTarget, setRefundTarget] = useState<AdminReservationListItem | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        setReservations(await api.get<AdminReservationListItem[]>(`/admin/reservations?${params.toString()}`));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("loadError"));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  function statusLabel(s: ReservationStatus) {
    const key: Record<ReservationStatus, string> = {
      PENDING_VALIDATION: "statusPendingResponse",
      CONFIRMED: "statusConfirmed",
      ACTIVE: "statusActive",
      COMPLETED: "statusCompleted",
      CANCELLED_BY_ANNONCEUR: "statusCancelledByAnnonceur",
      CANCELLED_BY_COMMERCANT: "statusCancelledByCommercant",
      NO_SHOW: "statusNoShow",
      DISPUTE: "statusDispute",
    };
    return tReservations(key[s]);
  }

  function openRefund(r: AdminReservationListItem) {
    setRefundTarget(r);
    setRefundAmount("");
    setRefundReason("");
  }

  async function confirmRefund() {
    if (!refundTarget) return;
    setSubmitting(true);
    try {
      const updated = await api.post<{ status: TransactionStatus; refundedAmount: string }>(
        `/admin/reservations/${refundTarget.id}/refund`,
        { amount: Number(refundAmount), reason: refundReason },
      );
      setReservations((prev) =>
        prev.map((r) =>
          r.id === refundTarget.id && r.transaction
            ? { ...r, transaction: { ...r.transaction, status: updated.status, refundedAmount: updated.refundedAmount } }
            : r,
        ),
      );
      toast.success(t("refundSuccess"));
      setRefundTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <IconInput
            icon={Search}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={status} onValueChange={(v) => v && setStatus(v as "ALL" | ReservationStatus)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue>{(v: string) => (v === "ALL" ? t("filterStatusAll") : statusLabel(v as ReservationStatus))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filterStatusAll")}</SelectItem>
              {Object.values(ReservationStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <Card className="overflow-hidden p-0 shadow-sm">
          {loading && (
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> ...
            </div>
          )}
          {reservations.length === 0 ? (
            <EmptyState icon={Search} title={t("emptyTitle")} className="py-12" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{t("tableCommercant")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableAnnonceur")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableAmount")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableCommission")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableStatus")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableDate")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("tableActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reservations.map((r) => {
                    const canRefund =
                      r.transaction &&
                      (r.transaction.status === TransactionStatus.PAID || r.transaction.status === TransactionStatus.PARTIALLY_REFUNDED) &&
                      Number(r.transaction.refundedAmount) < Number(r.transaction.amount);
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{r.space.commercantProfile.businessName}</td>
                        <td className="px-4 py-3">
                          <AdvertiserIdentity profile={r.annonceurProfile} email={r.annonceurProfile.user.email} />
                        </td>
                        <td className="px-4 py-3 font-medium tabular-nums">
                          {r.transaction ? `${Number(r.transaction.amount).toFixed(2)} €` : t("noPaymentYet")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {r.transaction ? `${Number(r.transaction.commissionAmount).toFixed(2)} €` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[r.status]}>{statusLabel(r.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(dateLocale)}</td>
                        <td className="px-4 py-3 text-right">
                          {canRefund && (
                            <Button size="sm" variant="outline" onClick={() => openRefund(r)}>
                              <Undo2 className="size-3.5" /> {t("forceRefund")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Reveal>

      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("forceRefundTitle")}</DialogTitle>
            <DialogDescription>{t("forceRefundDesc")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refundAmount">{t("amountLabel")}</Label>
              <Input
                id="refundAmount"
                type="number"
                min={0.01}
                step="0.01"
                max={refundTarget?.transaction ? Number(refundTarget.transaction.amount) - Number(refundTarget.transaction.refundedAmount) : undefined}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refundReason">{t("reasonLabel")}</Label>
              <Textarea id="refundReason" rows={3} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
            </div>
          </div>

          <DialogFooter>
            <Button disabled={submitting || !refundAmount || !refundReason.trim()} onClick={confirmRefund}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {t("refundCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
