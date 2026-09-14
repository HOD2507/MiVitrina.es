"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Affiche un toast selon `?payment=success|cancelled` (posé par les
 * success_url/cancel_url de la session Stripe Checkout — voir
 * ReservationsService.createCheckoutSession côté API), puis nettoie
 * l'URL pour ne pas re-déclencher le toast à chaque refresh.
 */
export function PaymentStatusToast({ payment }: { payment?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (payment === "success") {
      toast.success("Paiement reçu ! Le commerçant va examiner votre demande.");
    } else if (payment === "cancelled") {
      toast.info("Paiement annulé — vous pouvez réessayer quand vous voulez.");
    } else {
      return;
    }
    router.replace(pathname);
  }, [payment, router, pathname]);

  return null;
}
