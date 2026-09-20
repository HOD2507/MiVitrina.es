"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Volontairement pas de gestion d'erreur spécifique par email inexistant :
 * l'API renvoie toujours {ok:true} (anti-énumération de comptes), donc le
 * seul état possible ici après soumission est "envoyé" ou "erreur réseau".
 */
export default function ForgotPasswordPage() {
  const t = useTranslations("Auth.forgotPassword");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <Card className="border-border/70 shadow-xl shadow-foreground/[0.04]">
      <CardHeader className="pb-2 text-center sm:text-left">
        <CardTitle className="font-heading text-3xl font-medium">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {sent ? (
          <p className="text-sm text-muted-foreground">{t("success")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="h-11 w-full rounded-full text-base" size="lg">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t("submit")}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground max-lg:flex max-lg:min-h-11 max-lg:items-center max-lg:justify-center"
        >
          {t("backToLogin")}
        </Link>
      </CardContent>
    </Card>
  );
}
