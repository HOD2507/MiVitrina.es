"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, CreditCard, Loader2, Lock, MapPin, MessageCircle, Store } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { Reservation } from "@/lib/types";
import { getAnnonceurDisplayName, ReservationStatus, TransactionStatus } from "@mivitrina/shared";
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
import { UserAvatar } from "@/components/user-avatar";

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
  const PAYMENT_BADGE: Partial<Record<TransactionStatus, { label: string; variant: "success" | "secondary" }>> = {
    PAID: { label: t("paymentPaid"), variant: "success" },
    REFUNDED: { label: t("paymentRefunded"), variant: "secondary" },
    PARTIALLY_REFUNDED: { label: t("paymentPartiallyRefunded"), variant: "secondary" },
  };

  const advertiser = reservation.annonceurProfile;
  // Nombre público del anunciante — nunca su email (dato interno, ni siquiera llega del API).
  const advertiserName = getAnnonceurDisplayName(advertiser, locale);

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
      // `paid`: Stripe ya cobró esta reserva pero el aviso (webhook) aún no había llegado;
      // el servidor lo concilia y no hay nada más que pagar.
      const result = await api.post<{ url: string } | { paid: true }>(`/reservations/${reservation.id}/checkout`);
      if ("paid" in result) {
        toast.success(t("toastAlreadyPaid"));
        setPaying(false);
        router.refresh();
        return;
      }
      window.location.href = result.url;
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
    <Card interactive className="cursor-default">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-0 items-start gap-3">
          {/* El comerciante ve quién le hace la solicitud: foto del anunciante (o iniciales). */}
          {viewer === "commercant" && (
            <UserAvatar src={advertiser?.user.avatarUrl} name={advertiserName ?? ""} size="md" />
          )}
          <div className="min-w-0">
            {/* Comerciante: quien pide (con su foto al lado) es el título, el espacio va debajo. */}
            <CardTitle className="text-lg">
              {viewer === "annonceur" ? reservation.space.commercantProfile?.businessName : advertiserName}
            </CardTitle>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              {viewer === "annonceur" ? (
                <MapPin className="size-3.5" />
              ) : (
                <Store className="size-3.5" />
              )}
              {reservation.space.name}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {paymentBadge && <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>}
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-accent/60 p-4">
            <div className="min-w-0 flex-1 basis-56">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Lock className="size-3.5 text-primary" />
                {t("payPanelTitle")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("payPanelDesc")}</p>
            </div>
            <Button size="lg" disabled={paying} onClick={handlePay}>
              {paying ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              {t("pay", { amount: Number(reservation.transaction.amount).toFixed(2) })}
            </Button>
          </div>
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
