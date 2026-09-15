"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, CreditCard, Loader2, MapPin, MessageCircle, Store } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { Reservation } from "@/lib/types";
import { ReservationStatus, TransactionStatus } from "@mivitrina/shared";
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
import { PhotoStepSection } from "@/components/photo-step-section";
import { getDateLocale } from "@/lib/date-locale";

interface ReservationCardProps {
  reservation: Reservation;
  viewer: "annonceur" | "commercant";
  onUpdated?: (reservation: Reservation) => void;
}

export function ReservationCard({ reservation, viewer, onUpdated }: ReservationCardProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Reservations");
  const tPricing = useTranslations("Pricing");
  const tErrors = useTranslations("Auth.errors");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [paying, setPaying] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const STATUS_LABELS: Record<ReservationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING_VALIDATION: { label: t("statusPendingResponse"), variant: "outline" },
    CONFIRMED: { label: t("statusConfirmed"), variant: "default" },
    ACTIVE: { label: t("statusActive"), variant: "default" },
    COMPLETED: { label: t("statusCompleted"), variant: "secondary" },
    CANCELLED_BY_ANNONCEUR: { label: t("statusCancelledByAnnonceur"), variant: "destructive" },
    CANCELLED_BY_COMMERCANT: { label: t("statusCancelledByCommercant"), variant: "destructive" },
    NO_SHOW: { label: t("statusNoShow"), variant: "destructive" },
    DISPUTE: { label: t("statusDispute"), variant: "destructive" },
  };

  const DURATION_LABELS: Record<string, string> = {
    SEMAINE: tPricing("weekly"),
    MOIS: tPricing("monthly"),
    LIBRE: tPricing("free"),
  };

  /** Badge de statut de paiement — affiché seulement pour les statuts qui apportent une info utile. */
  const PAYMENT_BADGE: Partial<Record<TransactionStatus, { label: string; className: string }>> = {
    PAID: { label: t("paymentPaid"), className: "bg-green-600 text-white" },
    REFUNDED: { label: t("paymentRefunded"), className: "" },
    PARTIALLY_REFUNDED: { label: t("paymentPartiallyRefunded"), className: "" },
  };

  const statusInfo = STATUS_LABELS[reservation.status];
  const paymentBadge = PAYMENT_BADGE[reservation.transaction.status];
  const canRespond = viewer === "commercant" && reservation.status === ReservationStatus.PENDING_VALIDATION;
  const canCancel = viewer === "annonceur" && reservation.status === ReservationStatus.PENDING_VALIDATION;
  const canPay =
    viewer === "annonceur" &&
    reservation.status === ReservationStatus.PENDING_VALIDATION &&
    reservation.transaction.status === TransactionStatus.PENDING;

  async function handlePay() {
    setPaying(true);
    try {
      const { url } = await api.post<{ url: string }>(`/reservations/${reservation.id}/checkout`);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("toastPaymentError"));
      setPaying(false);
    }
  }

  async function respond(action: "approve" | "reject") {
    setSubmitting(true);
    try {
      const updated = await api.patch<Reservation>(`/reservations/${reservation.id}/respond`, {
        action,
        rejectionReason: action === "reject" ? rejectionReason : undefined,
      });
      toast.success(action === "approve" ? t("toastApproved") : t("toastRejected"));
      onUpdated?.(updated);
      setRejectOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenChat() {
    if (viewer === "commercant") {
      router.push("/messages");
      return;
    }
    const commercantProfileId = reservation.space.commercantProfile?.id;
    if (!commercantProfileId) return;

    setOpeningChat(true);
    try {
      const thread = await api.post<{ id: string }>("/chat/threads", {
        commercantProfileId,
        reservationId: reservation.id,
      });
      router.push(`/messages?thread=${thread.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("toastChatError"));
      setOpeningChat(false);
    }
  }

  async function handleCancel() {
    if (!confirm(t("confirmCancel"))) return;
    setSubmitting(true);
    try {
      const updated = await api.post<Reservation>(`/reservations/${reservation.id}/cancel`);
      toast.success(t("toastCancelled"));
      onUpdated?.(updated);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
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
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {paymentBadge && <Badge className={paymentBadge.className}>{paymentBadge.label}</Badge>}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" />
          {t("periodLabel", {
            start: new Date(reservation.startDate).toLocaleDateString(getDateLocale(locale)),
            end: new Date(reservation.endDate).toLocaleDateString(getDateLocale(locale)),
          })}{" "}
          · {DURATION_LABELS[reservation.pricingOption.durationType]} · {Number(reservation.transaction.amount).toFixed(2)} €
        </p>

        {reservation.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reservation.posterUrl}
            alt={t("posterAlt")}
            className="h-40 w-32 rounded-md border border-border object-cover"
          />
        )}

        {reservation.moderationNote && (
          <Alert variant="destructive">
            <AlertDescription>{reservation.moderationNote}</AlertDescription>
          </Alert>
        )}

        {reservation.status === ReservationStatus.DISPUTE && (
          <Alert variant="destructive">
            <AlertDescription>{t("disputeOpenNotice")}</AlertDescription>
          </Alert>
        )}

        <PhotoStepSection reservation={reservation} viewer={viewer} onUpdated={() => router.refresh()} />

        <Button size="sm" variant="ghost" disabled={openingChat} onClick={handleOpenChat} className="self-start">
          {openingChat ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
          {t("chat")}
        </Button>

        {canPay && (
          <Button size="sm" disabled={paying} onClick={handlePay} className="self-start">
            {paying ? <Loader2 className="size-3.5 animate-spin" /> : <CreditCard className="size-3.5" />}
            {t("pay", { amount: Number(reservation.transaction.amount).toFixed(2) })}
          </Button>
        )}

        {canRespond && reservation.transaction.status !== TransactionStatus.PAID && (
          <p className="text-sm text-muted-foreground">{t("awaitingPaymentNotice")}</p>
        )}

        {canRespond && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={submitting || reservation.transaction.status !== TransactionStatus.PAID}
              onClick={() => respond("approve")}
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {t("accept")}
            </Button>
            <Button size="sm" variant="outline" disabled={submitting} onClick={() => setRejectOpen(true)}>
              {t("reject")}
            </Button>
          </div>
        )}

        {canCancel && (
          <Button size="sm" variant="outline" disabled={submitting} onClick={handleCancel} className="self-start">
            {t("cancelMyRequest")}
          </Button>
        )}
      </CardContent>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectDialogTitle")}</DialogTitle>
            <DialogDescription>{t("rejectDialogDesc")}</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t("rejectPlaceholder")}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || submitting}
              onClick={() => respond("reject")}
            >
              {t("confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
