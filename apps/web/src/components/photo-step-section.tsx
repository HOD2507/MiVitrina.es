"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldAlert, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { uploadPhoto } from "@/lib/upload-photo";
import type { Reservation } from "@/lib/types";
import { ReservationStatus } from "@mivitrina/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhotoStepSectionProps {
  reservation: Reservation;
  viewer: "annonceur" | "commercant";
  /** Appelé après une action réussie — le parent recharge les données (router.refresh()). */
  onUpdated: () => void;
}

/**
 * Section "double confirmation photo" affichée dans ReservationCard pour
 * les statuts CONFIRMED (étape pose) et ACTIVE (étape retrait) — le
 * commerçant envoie une preuve, l'annonceur confirme ou ouvre un litige.
 * Ne rend rien pour les autres statuts.
 */
export function PhotoStepSection({ reservation, viewer, onUpdated }: PhotoStepSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const step =
    reservation.status === ReservationStatus.CONFIRMED
      ? "install"
      : reservation.status === ReservationStatus.ACTIVE
        ? "removal"
        : null;
  if (!step) return null;

  const isInstall = step === "install";
  const photoUrl = isInstall ? reservation.installPhotoUrl : reservation.removalPhotoUrl;
  const label = isInstall ? "pose" : "retrait";
  /** "pose" est féminin, "retrait" est masculin — accord de l'article selon l'étape. */
  const stepWithArticle = isInstall ? "la pose" : "le retrait";
  const uploadPath = `/reservations/${reservation.id}/${isInstall ? "install-photo" : "removal-photo"}`;
  const confirmPath = `/reservations/${reservation.id}/${isInstall ? "confirm-install" : "confirm-removal"}`;
  const uploadPurpose = isInstall ? "install-photo" : "removal-photo";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { key } = await uploadPhoto(file, uploadPurpose);
      await api.post<Reservation>(uploadPath, { key });
      toast.success(`Photo de ${label} envoyée — en attente de confirmation de l'annonceur.`);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "L'envoi a échoué.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function respondToPhoto(action: "confirm" | "dispute") {
    setSubmitting(true);
    try {
      await api.patch<Reservation>(confirmPath, {
        action,
        reason: action === "dispute" ? disputeReason : undefined,
      });
      toast.success(action === "confirm" ? `${isInstall ? "Pose" : "Retrait"} confirmé(e).` : "Litige ouvert — notre équipe va l'examiner.");
      onUpdated();
      setDisputeOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-2 text-sm font-medium">
        {isInstall ? "Confirmation de la pose de l'affiche" : "Confirmation du retrait de l'affiche"}
      </p>

      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={`Preuve de ${label}`}
          className="mb-2 h-40 w-32 rounded-md border border-border object-cover"
        />
      )}

      {viewer === "commercant" && !photoUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Envoyez une photo prouvant que l'affiche a bien été {isInstall ? "posée" : "retirée"}.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="self-start">
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Déclarer {stepWithArticle}
          </Button>
        </div>
      )}

      {viewer === "commercant" && photoUrl && (
        <p className="text-sm text-muted-foreground">En attente de confirmation de l'annonceur.</p>
      )}

      {viewer === "annonceur" && !photoUrl && (
        <p className="text-sm text-muted-foreground">
          En attente que le commerçant déclare {stepWithArticle} de l'affiche.
        </p>
      )}

      {viewer === "annonceur" && photoUrl && (
        <div className="flex gap-2">
          <Button size="sm" disabled={submitting} onClick={() => respondToPhoto("confirm")}>
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Confirmer {stepWithArticle}
          </Button>
          <Button size="sm" variant="outline" disabled={submitting} onClick={() => setDisputeOpen(true)}>
            <ShieldAlert className="size-3.5" />
            Signaler un problème
          </Button>
        </div>
      )}

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
            <DialogDescription>
              Expliquez ce qui ne va pas avec cette photo — un litige sera ouvert et examiné par l'équipe MiVitrina.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Ex : l'affiche n'est pas visible sur la photo, ce n'est pas la bonne vitrine..."
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!disputeReason.trim() || submitting}
              onClick={() => respondToPhoto("dispute")}
            >
              Ouvrir le litige
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
