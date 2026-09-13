"use client";

import { useState, type FormEvent } from "react";
import { RentalDurationType } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import type { PricingOption } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const DURATION_LABELS: Record<RentalDurationType, string> = {
  SEMAINE: "Par semaine",
  MOIS: "Par mois",
  LIBRE: "Durée libre",
};

interface PricingOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onSaved: (pricingOption: PricingOption) => void;
}

export function PricingOptionDialog({ open, onOpenChange, spaceId, onSaved }: PricingOptionDialogProps) {
  const [durationType, setDurationType] = useState<RentalDurationType>(RentalDurationType.SEMAINE);
  const [price, setPrice] = useState("");
  const [minDurationDays, setMinDurationDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const saved = await api.post<PricingOption>(`/vitrine-spaces/${spaceId}/pricing-options`, {
        durationType,
        price: Number(price),
        minDurationDays: durationType === RentalDurationType.LIBRE ? Number(minDurationDays) : undefined,
      });
      onSaved(saved);
      toast.success("Tarif ajouté.");
      onOpenChange(false);
      setPrice("");
      setMinDurationDays("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un tarif</DialogTitle>
            <DialogDescription>Définissez un prix pour une durée de location donnée.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pricing-duration">Durée</Label>
              <Select value={durationType} onValueChange={(v) => setDurationType(v as RentalDurationType)}>
                <SelectTrigger id="pricing-duration" className="w-full">
                  <SelectValue>{(value: RentalDurationType) => DURATION_LABELS[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RentalDurationType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {DURATION_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pricing-price">Prix (€)</Label>
              <Input
                id="pricing-price"
                type="number"
                min={0.01}
                step={0.01}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            {durationType === RentalDurationType.LIBRE && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pricing-min-days">Durée minimale (jours)</Label>
                <Input
                  id="pricing-min-days"
                  type="number"
                  min={1}
                  required
                  value={minDurationDays}
                  onChange={(e) => setMinDurationDays(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              Ajouter le tarif
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
