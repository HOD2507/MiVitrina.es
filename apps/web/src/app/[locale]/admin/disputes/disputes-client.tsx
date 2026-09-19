"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, ShieldAlert } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { AdminDispute } from "@/lib/types";
import { ReservationStatus, TransactionStatus } from "@mivitrina/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Reveal } from "@/components/reveal";

export function DisputesClient({ initialDisputes }: { initialDisputes: AdminDispute[] }) {
  const t = useTranslations("Admin.disputes");
  const [disputes, setDisputes] = useState(initialDisputes);
  const [target, setTarget] = useState<AdminDispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [outcome, setOutcome] = useState<"RESOLVED" | "REJECTED">("RESOLVED");
  const [refundAmount, setRefundAmount] = useState("");
  const [nextStatus, setNextStatus] = useState<string>(ReservationStatus.CANCELLED_BY_COMMERCANT);
  const [submitting, setSubmitting] = useState(false);

  const NEXT_STATUS_LABELS: Record<string, string> = {
    ACTIVE: t("nextStatusActive"),
    COMPLETED: t("nextStatusCompleted"),
    CANCELLED_BY_COMMERCANT: t("nextStatusCancelled"),
  };

  function openDialog(d: AdminDispute) {
    setTarget(d);
    setResolution("");
    setOutcome("RESOLVED");
    setRefundAmount("");
    setNextStatus(ReservationStatus.CANCELLED_BY_COMMERCANT);
  }

  async function submit() {
    if (!target) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/disputes/${target.id}/resolve`, {
        resolution,
        outcome,
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
        nextStatus,
      });
      toast.success(t("resolveSuccess"));
      setDisputes((prev) => prev.filter((d) => d.id !== target.id));
      setTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>

      {disputes.length === 0 ? (
        <Reveal delay={80}>
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <EmptyState icon={ShieldAlert} title={t("emptyTitle")} description={t("emptyDesc")} className="py-10" />
          </div>
        </Reveal>
      ) : (
        <div className="flex flex-col gap-4">
          {disputes.map((d, i) => (
            <Reveal key={d.id} delay={80 + i * 60}>
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldAlert className="size-4.5 text-destructive" />
                      {d.reservation.space.commercantProfile.businessName} ↔ {d.reservation.annonceurProfile.user.email}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("openedBy", {
                        email: d.raisedBy.email,
                        role: d.raisedBy.role === "ANNONCEUR" ? t("roleAnnonceur") : t("roleCommercant"),
                      })}
                    </p>
                  </div>
                  <Badge variant="outline">{Number(d.reservation.transaction.amount).toFixed(2)} €</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm">{d.reason}</p>
                  <Button size="sm" onClick={() => openDialog(d)} className="self-start">
                    {t("resolve")}
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resolveDialogTitle")}</DialogTitle>
            <DialogDescription>{target?.reason}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("decisionLabel")}</Label>
              <Select value={outcome} onValueChange={(v) => v && setOutcome(v as "RESOLVED" | "REJECTED")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => (value === "RESOLVED" ? t("decisionResolved") : t("decisionRejected"))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESOLVED">{t("decisionResolved")}</SelectItem>
                  <SelectItem value="REJECTED">{t("decisionRejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("explanationLabel")}</Label>
              <Textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder={t("explanationPlaceholder")} />
            </div>

            {target && target.reservation.transaction.status === TransactionStatus.PAID && (
              <div className="flex flex-col gap-1.5">
                <Label>{t("refundLabel")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  max={Number(target.reservation.transaction.amount)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>{t("nextStatusLabel")}</Label>
              <Select value={nextStatus} onValueChange={(v) => v && setNextStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => NEXT_STATUS_LABELS[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ReservationStatus.ACTIVE}>{NEXT_STATUS_LABELS.ACTIVE}</SelectItem>
                  <SelectItem value={ReservationStatus.COMPLETED}>{NEXT_STATUS_LABELS.COMPLETED}</SelectItem>
                  <SelectItem value={ReservationStatus.CANCELLED_BY_COMMERCANT}>{NEXT_STATUS_LABELS.CANCELLED_BY_COMMERCANT}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button disabled={!resolution.trim() || submitting} onClick={submit}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {t("confirmResolve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
