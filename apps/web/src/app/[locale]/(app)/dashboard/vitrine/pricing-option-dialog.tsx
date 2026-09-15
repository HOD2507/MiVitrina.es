"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
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

/** Fonction (pas une const module-level) car dépend de `t`, calculé dans le composant. */
export function buildDurationLabels(
  t: ReturnType<typeof useTranslations<"Pricing">>,
): Record<RentalDurationType, string> {
  return {
    SEMAINE: t("weekly"),
    MOIS: t("monthly"),
    LIBRE: t("free"),
  };
}

interface PricingOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onSaved: (pricingOption: PricingOption) => void;
}

export function PricingOptionDialog({ open, onOpenChange, spaceId, onSaved }: PricingOptionDialogProps) {
  const t = useTranslations("Pricing");
  const tErrors = useTranslations("Auth.errors");
  const DURATION_LABELS = buildDurationLabels(t);
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
      toast.success(t("rateAdded"));
      onOpenChange(false);
      setPrice("");
      setMinDurationDays("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("addRate")}</DialogTitle>
            <DialogDescription>{t("addRateDesc")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pricing-duration">{t("durationLabel")}</Label>
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
              <Label htmlFor="pricing-price">{t("priceLabel")}</Label>
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
                <Label htmlFor="pricing-min-days">{t("minDurationLabel")}</Label>
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
              {t("submitAddRate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
