"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

/** Bouton d'action pour l'alerte "email non vérifié" des tableaux de bord. */
export function ResendVerificationButton() {
  const t = useTranslations("Auth.verifyEmail");
  const tErrors = useTranslations("Auth.errors");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await api.post("/auth/resend-verification");
      setSent(true);
      toast.success(t("resendSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={submitting || sent} onClick={handleClick} className="mt-2">
      {submitting && <Loader2 className="size-3.5 animate-spin" />}
      {sent ? t("sentLabel") : t("resend")}
    </Button>
  );
}
