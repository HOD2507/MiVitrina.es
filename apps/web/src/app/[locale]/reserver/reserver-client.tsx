"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { RentalDurationType } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import { uploadPhoto } from "@/lib/upload-photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker, type BlockedRange } from "@/components/date-picker";
import { Loader2 } from "lucide-react";

const DURATION_LABELS: Record<string, string> = {
  SEMAINE: "par semaine",
  MOIS: "par mois",
  LIBRE: "durée libre",
};

interface ReserverClientProps {
  spaceId: string;
  pricingOptionId: string;
  businessName: string;
  spaceName: string;
  durationType: "SEMAINE" | "MOIS" | "LIBRE";
  price: string;
  minDurationDays: number | null;
}

function computeEndDate(start: string, durationType: string, customDurationDays: number): string | null {
  if (!start) return null;
  const date = new Date(start + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return null;
  if (durationType === RentalDurationType.SEMAINE) {
    date.setUTCDate(date.getUTCDate() + 7);
  } else if (durationType === RentalDurationType.MOIS) {
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else {
    date.setUTCDate(date.getUTCDate() + (customDurationDays || 0));
  }
  return date.toISOString().slice(0, 10);
}

export function ReserverClient({
  spaceId,
  pricingOptionId,
  businessName,
  spaceName,
  durationType,
  price,
  minDurationDays,
}: ReserverClientProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [customDurationDays, setCustomDurationDays] = useState(minDurationDays ?? 1);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);

  useEffect(() => {
    api
      .get<BlockedRange[]>(`/discovery/spaces/${spaceId}/availability`)
      .then(setBlockedRanges)
      .catch(() => {
        // Affichage indicatif seulement : une erreur ici ne bloque pas la réservation,
        // le vrai contrôle anti-chevauchement reste fait par l'API à la création.
      });
  }, [spaceId]);

  const endDate = useMemo(
    () => computeEndDate(startDate, durationType, customDurationDays),
    [startDate, durationType, customDurationDays],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!posterFile) {
      setError("Merci de joindre votre affiche avant de réserver.");
      return;
    }
    if (durationType === RentalDurationType.LIBRE && minDurationDays && customDurationDays < minDurationDays) {
      setError(`Durée minimale pour ce tarif : ${minDurationDays} jour(s).`);
      return;
    }

    setSubmitting(true);
    try {
      const reservation = await api.post<{ id: string }>("/reservations", {
        spaceId,
        pricingOptionId,
        startDate,
        customDurationDays: durationType === RentalDurationType.LIBRE ? customDurationDays : undefined,
      });

      try {
        const { key } = await uploadPhoto(posterFile, "poster");
        await api.post(`/reservations/${reservation.id}/poster`, { key });
      } catch {
        toast.error(
          "Votre demande a été créée mais l'envoi de l'affiche a échoué. Réessayez depuis \"Mes réservations\".",
        );
        router.push("/mes-reservations");
        return;
      }

      toast.success("Demande de réservation envoyée !");
      router.push("/mes-reservations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Réserver un espace</CardTitle>
        <CardDescription>
          {businessName} — {spaceName} · {Number(price).toFixed(2)} € {DURATION_LABELS[durationType]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">Date de début</Label>
            <DatePicker
              id="startDate"
              value={startDate}
              minDate={today}
              onChange={setStartDate}
              blockedRanges={blockedRanges}
              computeRangeEnd={(start) => computeEndDate(start, durationType, customDurationDays)}
            />
          </div>

          {durationType === RentalDurationType.LIBRE && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customDurationDays">Durée (jours)</Label>
              <Input
                id="customDurationDays"
                type="number"
                min={minDurationDays ?? 1}
                required
                value={customDurationDays}
                onChange={(e) => setCustomDurationDays(Number(e.target.value))}
              />
            </div>
          )}

          {endDate && (
            <p className="text-sm text-muted-foreground">
              Période : du {startDate} au {endDate}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="poster">Votre affiche</Label>
            <Input
              id="poster"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WEBP. Elle sera soumise à la validation du commerçant avant confirmation.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={submitting} size="lg">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Envoyer la demande de réservation
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
