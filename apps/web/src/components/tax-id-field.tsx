"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Country } from "@mivitrina/shared";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidSpanishTaxId } from "@/lib/spanish-tax-id";

interface TaxIdFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  country: Country;
  required?: boolean;
  /** Explique quand mettre un NIF (autoentrepreneur) vs un CIF (société) — un comerciante ne sait pas toujours lequel des deux le concerne. */
  hint?: string;
  placeholder?: string;
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Champ NIF/CIF avec avis en direct : format invalide (calcul de la lettre
 * de contrôle, instantané, voir lib/spanish-tax-id.ts) ou numéro déjà
 * enregistré par un autre commerce (débattu, API). N'est qu'un avis
 * pendant la saisie ; le blocage réel du passage à l'étape suivante refait
 * les deux vérifications au moment du clic (voir RegisterForm.validateStep).
 */
export function TaxIdField({ id, label, value, onChange, country, required, hint, placeholder, ref }: TaxIdFieldProps) {
  const t = useTranslations("Auth.taxId");
  const formatValid = useMemo(() => !value || isValidSpanishTaxId(value), [value]);
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    if (!value || !formatValid) {
      setTaken(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await api.get<{ available: boolean }>(
          `/auth/check-business-id?country=${country}&businessIdNumber=${encodeURIComponent(value)}`,
        );
        if (!cancelled) setTaken(!result.available);
      } catch {
        if (!cancelled) setTaken(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, formatValid, country]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={ref}
        id={id}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {!formatValid && <p className="text-xs text-destructive">{t("invalidFormat")}</p>}
      {formatValid && taken && <p className="text-xs text-destructive">{t("alreadyRegistered")}</p>}
      {formatValid && !taken && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
