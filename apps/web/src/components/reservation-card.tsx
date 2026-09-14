"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2, MapPin, Store } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { Reservation } from "@/lib/types";
import { ReservationStatus } from "@mivitrina/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const STATUS_LABELS: Record<ReservationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING_VALIDATION: { label: "En attente de réponse", variant: "outline" },
  CONFIRMED: { label: "Confirmée", variant: "default" },
  ACTIVE: { label: "En cours", variant: "default" },
  COMPLETED: { label: "Terminée", variant: "secondary" },
  CANCELLED_BY_ANNONCEUR: { label: "Annulée (annonceur)", variant: "destructive" },
  CANCELLED_BY_COMMERCANT: { label: "Refusée", variant: "destructive" },
  NO_SHOW: { label: "Absence constatée", variant: "destructive" },
  DISPUTE: { label: "Litige", variant: "destructive" },
};

const DURATION_LABELS: Record<string, string> = {
  SEMAINE: "par semaine",
  MOIS: "par mois",
  LIBRE: "durée libre",
};

interface ReservationCardProps {
  reservation: Reservation;
  viewer: "annonceur" | "commercant";
  onUpdated?: (reservation: Reservation) => void;
}

export function ReservationCard({ reservation, viewer, onUpdated }: ReservationCardProps) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const statusInfo = STATUS_LABELS[reservation.status];
  const canRespond = viewer === "commercant" && reservation.status === ReservationStatus.PENDING_VALIDATION;
  const canCancel = viewer === "annonceur" && reservation.status === ReservationStatus.PENDING_VALIDATION;

  async function respond(action: "approve" | "reject") {
    setSubmitting(true);
    try {
      const updated = await api.patch<Reservation>(`/reservations/${reservation.id}/respond`, {
        action,
        rejectionReason: action === "reject" ? rejectionReason : undefined,
      });
      toast.success(action === "approve" ? "Réservation confirmée." : "Demande refusée.");
      onUpdated?.(updated);
      setRejectOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Annuler cette demande de réservation ?")) return;
    setSubmitting(true);
    try {
      const updated = await api.post<Reservation>(`/reservations/${reservation.id}/cancel`);
      toast.success("Réservation annulée.");
      onUpdated?.(updated);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-lg">
            {viewer === "annonceur" ? reservation.space.commercantProfile?.businessName : reservation.space.name}
          </CardTitle>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            {viewer === "annonceur" ? (
              <>
                <MapPin className="size-3.5" /> {reservation.space.name}
              </>
            ) : (
              <>
                <Store className="size-3.5" />
                {reservation.annonceurProfile?.companyName || reservation.annonceurProfile?.user.email}
              </>
            )}
          </p>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" />
          Du {new Date(reservation.startDate).toLocaleDateString("fr-FR")} au{" "}
          {new Date(reservation.endDate).toLocaleDateString("fr-FR")} ·{" "}
          {DURATION_LABELS[reservation.pricingOption.durationType]} · {Number(reservation.transaction.amount).toFixed(2)} €
        </p>

        {reservation.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reservation.posterUrl}
            alt="Affiche proposée"
            className="h-40 w-32 rounded-md border border-border object-cover"
          />
        )}

        {reservation.moderationNote && (
          <Alert variant="destructive">
            <AlertDescription>{reservation.moderationNote}</AlertDescription>
          </Alert>
        )}

        {canRespond && (
          <div className="flex gap-2">
            <Button size="sm" disabled={submitting} onClick={() => respond("approve")}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Accepter
            </Button>
            <Button size="sm" variant="outline" disabled={submitting} onClick={() => setRejectOpen(true)}>
              Refuser
            </Button>
          </div>
        )}

        {canCancel && (
          <Button size="sm" variant="outline" disabled={submitting} onClick={handleCancel} className="self-start">
            Annuler ma demande
          </Button>
        )}
      </CardContent>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
            <DialogDescription>Expliquez brièvement pourquoi, l'annonceur en sera informé.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Ex: créneau finalement indisponible, affiche non conforme..."
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || submitting}
              onClick={() => respond("reject")}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
