"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, Scale, Percent, Clock } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { PlatformSettings } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/reveal";
import { StatsSummary } from "@/components/stats-summary";

export function SettingsClient({ initialSettings }: { initialSettings: PlatformSettings }) {
  const t = useTranslations("Admin.settings");
  const tErrors = useTranslations("Auth.errors");
  // Le taux est stocké en base en fraction (0.15) ; affiché ici en pourcentage (15) pour la saisie.
  const [commissionPercent, setCommissionPercent] = useState(String(Number(initialSettings.commissionRate) * 100));
  const [freeCancellationHours, setFreeCancellationHours] = useState(String(initialSettings.freeCancellationHours));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch("/admin/settings", {
        commissionRate: Number(commissionPercent) / 100,
        freeCancellationHours: Number(freeCancellationHours),
      });
      toast.success(t("saveSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <h1 className="flex items-center gap-2.5 font-heading text-4xl font-extrabold tracking-tight">
          <Scale className="size-8 text-primary" />
          {t("title")}
        </h1>
      </Reveal>

      {/* Aperçu en direct des valeurs en vigueur — occupe l'espace qui restait vide
          à droite du formulaire (retour utilisateur explicite) tout en étant utile
          (reflète ce qui vient d'être tapé, pas seulement les valeurs sauvegardées). */}
      <Reveal delay={40}>
        <StatsSummary
          items={[
            {
              icon: Percent,
              label: t("commissionLabel"),
              value: `${commissionPercent || 0}%`,
              tone: "primary",
            },
            {
              icon: Clock,
              label: t("freeCancellationLabel"),
              value: t("hoursValue", { hours: freeCancellationHours || 0 }),
              tone: "amber",
            },
          ]}
        />
      </Reveal>

      <Reveal delay={80}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardDescription>{t("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:max-w-md">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="commission">{t("commissionLabel")}</Label>
                <Input
                  id="commission"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  required
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="freeCancellation">{t("freeCancellationLabel")}</Label>
                <Input
                  id="freeCancellation"
                  type="number"
                  min={0}
                  required
                  value={freeCancellationHours}
                  onChange={(e) => setFreeCancellationHours(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={submitting} className="self-start">
                {submitting && <Loader2 className="size-3.5 animate-spin" />}
                {t("save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
