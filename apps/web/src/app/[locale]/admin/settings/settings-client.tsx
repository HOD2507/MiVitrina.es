"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { PlatformSettings } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsClient({ initialSettings }: { initialSettings: PlatformSettings }) {
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
      toast.success("Réglages mis à jour.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-lg">Réglages de la plateforme</CardTitle>
        <CardDescription>
          Le taux de commission s'applique à toutes les nouvelles réservations — les réservations déjà créées
          gardent le taux figé au moment du paiement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commission">Commission plateforme (%)</Label>
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
            <Label htmlFor="freeCancellation">Délai d'annulation gratuite (heures avant le début)</Label>
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
            Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
