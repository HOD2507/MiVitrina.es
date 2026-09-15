"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { StripeStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";

interface StripeConnectCardProps {
  status: StripeStatus;
  /** true si on revient tout juste du parcours d'onboarding Stripe (?stripe=return). */
  justReturned?: boolean;
}

/**
 * Carte "Connecter Stripe" du tableau de bord commerçant. `status` vient
 * d'un fetch serveur (GET /commercants/me/stripe/status côté page.tsx),
 * lequel resynchronise déjà `stripeOnboardingComplete` en base à chaque
 * appel — donc au retour d'onboarding (`?stripe=return`), la donnée
 * affichée ici est déjà à jour sans logique supplémentaire côté client.
 */
export function StripeConnectCard({ status, justReturned }: StripeConnectCardProps) {
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="size-4.5" />
              {t("paymentsTitle")}
            </CardTitle>
            <CardDescription>{t("stripeConnectedDesc")}</CardDescription>
          </div>
          <Badge className="bg-green-600 text-white">
            <CheckCircle2 className="size-3.5" /> {t("connected")}
          </Badge>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="size-4.5" />
          {t("paymentsTitle")}
        </CardTitle>
        <CardDescription>{status.connected ? t("stripeIncompleteDesc") : t("stripeMissingDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" disabled={loading} onClick={startOnboarding}>
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {status.connected ? t("stripeFinishSetup") : t("stripeConnect")}
        </Button>
      </CardContent>
    </Card>
  );
}
