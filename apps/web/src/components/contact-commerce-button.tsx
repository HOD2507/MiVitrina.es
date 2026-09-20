"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { MessageCircle, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

/**
 * Bouton "Contactar con este comercio" sur la fiche publique — accessible même
 * déconnecté (la page l'est), mais l'ouverture de conversation nécessite
 * un compte annonceur : une 401/403 renvoie simplement vers /login.
 */
export function ContactCommerceButton({ commercantProfileId }: { commercantProfileId: string }) {
  const router = useRouter();
  const t = useTranslations("Vitrine");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const thread = await api.post<{ id: string }>("/chat/threads", { commercantProfileId });
      router.push(`/messages?thread=${thread.id}`);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.push("/login");
        return;
      }
      toast.error(err instanceof ApiError ? err.message : t("contactError"));
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={handleClick}>
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
      {t("contactCommerce")}
    </Button>
  );
}
