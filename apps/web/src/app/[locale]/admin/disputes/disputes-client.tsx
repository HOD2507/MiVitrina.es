"use client";

import { useState } from "react";
import { toast } from "sonner";
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

const NEXT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Remettre en cours (litige non fondé)",
  COMPLETED: "Marquer comme terminée",
  CANCELLED_BY_COMMERCANT: "Annuler la réservation",
};

export function DisputesClient({ initialDisputes }: { initialDisputes: AdminDispute[] }) {
  const [disputes, setDisputes] = useState(initialDisputes);
  const [target, setTarget] = useState<AdminDispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [outcome, setOutcome] = useState<"RESOLVED" | "REJECTED">("RESOLVED");
  const [refundAmount, setRefundAmount] = useState("");
  const [nextStatus, setNextStatus] = useState<string>(ReservationStatus.CANCELLED_BY_COMMERCANT);
  const [submitting, setSubmitting] = useState(false);

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
      toast.success("Litige résolu.");
      setDisputes((prev) => prev.filter((d) => d.id !== target.id));
      setTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (disputes.length === 0) {
    return <p className="text-muted-foreground">Aucun litige ouvert.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {disputes.map((d) => (
        <Card key={d.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="size-4.5 text-destructive" />
                {d.reservation.space.commercantProfile.businessName} ↔ {d.reservation.annonceurProfile.user.email}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Ouvert par {d.raisedBy.email} ({d.raisedBy.role === "ANNONCEUR" ? "annonceur" : "commerçant"})
              </p>
            </div>
            <Badge variant="outline">{Number(d.reservation.transaction.amount).toFixed(2)} €</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm">{d.reason}</p>
            <Button size="sm" onClick={() => openDialog(d)} className="self-start">
              Résoudre
            </Button>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résoudre le litige</DialogTitle>
            <DialogDescription>{target?.reason}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Décision</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as "RESOLVED" | "REJECTED")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => (value === "RESOLVED" ? "Réclamation actée" : "Litige non fondé (rejeté)")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESOLVED">Réclamation actée</SelectItem>
                  <SelectItem value="REJECTED">Litige non fondé (rejeté)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Explication</Label>
              <Textarea
                rows={3}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Ex : la photo confirme que l'affiche n'était pas posée, remboursement accordé."
              />
            </div>

            {target && target.reservation.transaction.status === TransactionStatus.PAID && (
              <div className="flex flex-col gap-1.5">
                <Label>Montant à rembourser à l'annonceur (€, optionnel)</Label>
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
              <Label>Suite pour la réservation</Label>
              <Select value={nextStatus} onValueChange={(v) => v && setNextStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => NEXT_STATUS_LABELS[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ReservationStatus.ACTIVE}>{NEXT_STATUS_LABELS.ACTIVE}</SelectItem>
                  <SelectItem value={ReservationStatus.COMPLETED}>{NEXT_STATUS_LABELS.COMPLETED}</SelectItem>
                  <SelectItem value={ReservationStatus.CANCELLED_BY_COMMERCANT}>
                    {NEXT_STATUS_LABELS.CANCELLED_BY_COMMERCANT}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button disabled={!resolution.trim() || submitting} onClick={submit}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Valider la résolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
