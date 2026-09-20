"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { RentalDurationType } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import { uploadPhoto } from "@/lib/upload-photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker, type BlockedRange } from "@/components/date-picker";
import { getDateLocale } from "@/lib/date-locale";
import { CalendarDays, ImagePlus, Loader2, Lock, RotateCcw } from "lucide-react";

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
  const locale = useLocale();
  const t = useTranslations("Reservations");
  const tPricing = useTranslations("Pricing");
  const tErrors = useTranslations("Auth.errors");
  const DURATION_LABELS: Record<string, string> = {
    SEMAINE: tPricing("weekly"),
    MOIS: tPricing("monthly"),
    LIBRE: tPricing("free"),
  };
  const today = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [customDurationDays, setCustomDurationDays] = useState(minDurationDays ?? 1);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

  // Miniature locale de l'affiche choisie (libérée quand elle change / au démontage).
  useEffect(() => {
    if (!posterFile) {
      setPosterPreview(null);
      return;
    }
    const url = URL.createObjectURL(posterFile);
    setPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [posterFile]);

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
      setError(t("posterRequiredError"));
      return;
    }
    if (durationType === RentalDurationType.LIBRE && minDurationDays && customDurationDays < minDurationDays) {
      setError(t("minDurationError", { days: minDurationDays }));
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
        toast.error(t("posterUploadFailedError"));
        router.push("/mes-reservations");
        return;
      }

      toast.success(t("bookingSentSuccess"));
      router.push("/mes-reservations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00Z").toLocaleDateString(getDateLocale(locale), { dateStyle: "medium", timeZone: "UTC" });
  const total = `${Number(price).toFixed(2)} €`;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="flex flex-col gap-6">
        {/* Étape 1 — dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <StepNumber n={1} />
              {t("stepDatesTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">{t("startDateLabel")}</Label>
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
                <Label htmlFor="customDurationDays">{t("customDurationLabel")}</Label>
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
              <p className="flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-sm text-accent-foreground">
                <CalendarDays className="size-4 shrink-0 text-primary" />
                {t("periodLabel", { start: formatDate(startDate), end: formatDate(endDate) })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Étape 2 — affiche */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <StepNumber n={2} />
              {t("stepPosterTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <label
              htmlFor="poster"
              className="group flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-border bg-muted/40 p-4 transition-colors hover:border-primary/50 hover:bg-accent/40 has-[:focus-visible]:border-primary has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40"
            >
              {posterPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterPreview} alt="" className="h-24 w-[4.5rem] shrink-0 rounded-md border border-border object-cover" />
              ) : (
                <span className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground ring-1 ring-border">
                  <ImagePlus className="size-7" />
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{posterFile ? posterFile.name : t("posterPrompt")}</span>
                <span className="text-xs text-muted-foreground">{posterFile ? t("posterChange") : t("posterHint")}</span>
              </span>
              <input
                id="poster"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Résumé — collant sur desktop, contient l'action principale */}
      <aside className="lg:sticky lg:top-24">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("summaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="font-medium">{businessName}</p>
              <p className="text-sm text-muted-foreground">{spaceName}</p>
            </div>

            <dl className="flex flex-col gap-2 border-y border-border py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("summaryDuration")}</dt>
                <dd className="font-medium">{DURATION_LABELS[durationType]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("summaryPeriod")}</dt>
                <dd className="text-right font-medium">
                  {endDate ? `${formatDate(startDate)} → ${formatDate(endDate)}` : "—"}
                </dd>
              </div>
            </dl>

            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">{t("summaryTotal")}</span>
              <span className="font-heading text-3xl font-bold tracking-tight">{total}</span>
            </div>

            <Button type="submit" disabled={submitting} size="lg" className="w-full">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t("submitBooking")}
            </Button>

            <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {t("secureNote")}
              </li>
              <li className="flex items-start gap-2">
                <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {t("refundNote")}
              </li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

/** Pastille numérotée des étapes du formulaire (1, 2). */
function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-primary font-sans text-sm font-semibold text-primary-foreground">
      {n}
    </span>
  );
}
