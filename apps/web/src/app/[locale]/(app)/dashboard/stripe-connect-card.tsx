"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { StripeStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, CreditCard } from "lucide-react";

interface StripeConnectActionProps {
  status: StripeStatus;
  /** true si on revient tout juste du parcours d'onboarding Stripe (?stripe=return). */
  justReturned?: boolean;
  /** "lg" pour l'étape la plus critique du parcours de mise en route — sans Stripe, aucune réservation payante n'est possible. */
  size?: "sm" | "lg";
}

/**
 * Juste l'action Stripe (badge "connecté" ou bouton), sans habillage de
 * carte — pensé pour s'insérer comme une ligne du "Primeros pasos" du
 * tableau de bord (voir OnboardingChecklist) plutôt que dans sa propre
 * carte séparée. `status` vient d'un fetch serveur (GET
 * /commercants/me/stripe/status côté page.tsx), lequel resynchronise déjà
 * `stripeOnboardingComplete` en base à chaque appel — donc au retour
 * d'onboarding (`?stripe=return`), la donnée affichée ici est déjà à jour
 * sans logique supplémentaire côté client.
 */
export function StripeConnectAction({ status, justReturned, size = "sm" }: StripeConnectActionProps) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!justReturned) return;
    if (status.onboardingComplete) {
      toast.success(t("stripeConnectedToast"));
    } else {
      toast.info(t("stripeNotCompleteToast"));
    }
    // Nettoie ?stripe=return de l'URL pour ne pas re-déclencher le toast au refresh.
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justReturned, status.onboardingComplete, router, pathname]);

  async function startOnboarding() {
    setLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/commercants/me/stripe/onboarding");
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("stripeStartError"));
      setLoading(false);
    }
  }

  if (status.onboardingComplete) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3.5" /> {t("connected")}
      </Badge>
    );
  }

  return (
    <Button
      size={size}
      className={cn(
        "shadow-sm transition-transform duration-150 hover:scale-[1.03] active:scale-95",
        size === "lg" && "h-11 gap-2 rounded-full bg-gradient-to-r from-primary to-glow-amber px-6 text-base shadow-primary/25",
      )}
      disabled={loading}
      onClick={startOnboarding}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : size === "lg" && <CreditCard className="size-4.5" />}
      {status.connected ? t("stripeFinishSetup") : t("stripeConnect")}
    </Button>
  );
}
