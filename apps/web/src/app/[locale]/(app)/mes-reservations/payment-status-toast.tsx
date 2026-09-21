"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Affiche un toast selon `?payment=success|cancelled` (posé par les
 * success_url/cancel_url de la session Stripe Checkout — voir
 * ReservationsService.createCheckoutSession côté API), puis nettoie
 * l'URL pour ne pas re-déclencher le toast à chaque refresh.
 */
export function PaymentStatusToast({ payment }: { payment?: string }) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (payment === "success") {
      toast.success(t("paymentReceivedToast"));
      // Stripe avisa al servidor por webhook, casi a la vez que redirige aquí: sin este
      // refresco la tarjeta podría seguir mostrando "Pago pendiente" con la página ya cargada.
      setTimeout(() => router.refresh(), 2000);
    } else if (payment === "cancelled") {
      toast.info(t("paymentCancelledToast"));
    } else {
      return;
    }
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment, router, pathname]);

  return null;
}
