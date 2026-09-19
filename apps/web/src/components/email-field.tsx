"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestEmailCorrection } from "@/lib/email-typo";

interface EmailFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  /** À l'inscription seulement — sur le login, une adresse "déjà utilisée" est le cas normal, pas une erreur. */
  checkAvailability?: boolean;
  ref?: React.Ref<HTMLInputElement>;
}

/** Un "@" suivi d'un domaine avec au moins un point après le premier
 * caractère — évite d'interroger l'API sur une saisie encore incomplète
 * ("toi@" ou "toi@gmail"). */
const LOOKS_LIKE_COMPLETE_DOMAIN = /^[^@]+@[^@.]+\.[^@]+$/;

/**
 * Champ email avec trois garde-fous complémentaires contre une adresse
 * injoignable ou déjà prise — voir la conversation avec l'utilisateur
 * après la création d'un compte sur "hanioulahdj2005@gmil.com", jamais
 * vérifié faute d'y avoir accès :
 * 1. Faute de frappe sur un domaine grand public connu (liste locale,
 *    instantané) — lib/email-typo.ts.
 * 2. Domaine qui n'a même pas de configuration mail (MX/A/AAAA), vérifié
 *    côté serveur via DNS — attrape un domaine inexistant qu'un domaine
 *    squatté comme "gmil.com" (qui a de vrais MX) ne déclenche pas.
 * 3. (inscription seulement) Un compte existe déjà avec cet email.
 * Ceci n'est qu'un avis en direct pendant la saisie ; le blocage réel du
 * passage à l'étape suivante refait le même appel au moment du clic (voir
 * RegisterForm.validateStep), pour ne jamais bloquer sur un état débattu périmé.
 */
export function EmailField({ id, label, value, onChange, required, className, checkAvailability, ref }: EmailFieldProps) {
  const t = useTranslations("Auth.emailTypo");
  const suggestion = useMemo(() => (value ? suggestEmailCorrection(value) : null), [value]);

  const [domainStatus, setDomainStatus] = useState<"unknown" | "checking" | "deliverable" | "undeliverable" | "taken">(
    "unknown",
  );

  useEffect(() => {
    if (suggestion || !LOOKS_LIKE_COMPLETE_DOMAIN.test(value)) {
      setDomainStatus("unknown");
      return;
    }
    let cancelled = false;
    setDomainStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const result = await api.get<{ deliverable: boolean; available: boolean }>(
          `/auth/check-email?email=${encodeURIComponent(value)}`,
        );
        if (cancelled) return;
        if (!result.deliverable) setDomainStatus("undeliverable");
        else if (checkAvailability && !result.available) setDomainStatus("taken");
        else setDomainStatus("deliverable");
      } catch {
        if (!cancelled) setDomainStatus("unknown");
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, suggestion, checkAvailability]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={ref}
        id={id}
        type="email"
        required={required}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suggestion ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t("didYouMean", { email: suggestion })}{" "}
          <button
            type="button"
            onClick={() => onChange(suggestion)}
            className="font-medium underline underline-offset-2"
          >
            {t("useThis")}
          </button>
        </p>
      ) : (
        <>
          {domainStatus === "undeliverable" && <p className="text-xs text-destructive">{t("domainNotDeliverable")}</p>}
          {domainStatus === "taken" && <p className="text-xs text-destructive">{t("emailAlreadyUsed")}</p>}
        </>
      )}
    </div>
  );
}
