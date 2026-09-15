"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!justReturned) return;
    if (status.onboardingComplete) {
      toast.success("Votre compte Stripe est connecté !");
    } else {
      toast.info("Onboarding Stripe non terminé — vous pouvez le reprendre à tout moment.");
    }
    // Nettoie ?stripe=return de l'URL pour ne pas re-déclencher le toast au refresh.
    router.replace(pathname);
  }, [justReturned, status.onboardingComplete, router, pathname]);

  async function startOnboarding() {
    setLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/commercants/me/stripe/onboarding");
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de démarrer la connexion Stripe.");
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
              Paiements
            </CardTitle>
            <CardDescription>Votre compte Stripe est connecté, vous pouvez recevoir des virements.</CardDescription>
          </div>
          <Badge className="bg-green-600 text-white">
            <CheckCircle2 className="size-3.5" /> Connecté
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
          Paiements
        </CardTitle>
        <CardDescription>
          {status.connected
            ? "Votre configuration Stripe n'est pas terminée — vous ne pourrez pas accepter de réservation payante tant qu'elle n'est pas complète."
            : "Connectez un compte Stripe pour recevoir les paiements de vos réservations. Sans ça, vous ne pourrez pas accepter de demande."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" disabled={loading} onClick={startOnboarding}>
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {status.connected ? "Terminer la configuration Stripe" : "Connecter Stripe"}
        </Button>
      </CardContent>
    </Card>
  );
}
