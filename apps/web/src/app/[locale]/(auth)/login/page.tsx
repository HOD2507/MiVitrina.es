"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useAuthProviders } from "@/lib/use-auth-providers";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default function LoginPage() {
  const t = useTranslations("Auth.login");
  const tErrors = useTranslations("Auth.errors");
  const router = useRouter();
  const providers = useAuthProviders();

  // Tant qu'un fournisseur externe (Google...) est disponible, on démarre
  // sur l'écran "boutons" plutôt que le formulaire — celui-ci n'apparaît
  // qu'après un clic sur "Continuer avec email". Sans fournisseur
  // configuré, le formulaire reste la seule option, donc autant l'afficher direct.
  const [showEmailForm, setShowEmailForm] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<{ user: AuthUser }>("/auth/login", { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  // Chargement de la config (bref) : rien n'a encore été décidé, on évite d'afficher le mauvais écran.
  if (providers === null) {
    return <Card className="h-64 border-border/70 shadow-xl shadow-foreground/[0.04]" />;
  }

  const hasExternalProvider = providers.googleEnabled;

  return (
    <Card className="border-border/70 shadow-xl shadow-foreground/[0.04]">
      <CardHeader className="pb-2 text-center sm:text-left">
        <CardTitle className="font-heading text-3xl font-medium">{t("title")}</CardTitle>
        <CardDescription>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("registerLink")}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        {hasExternalProvider && !showEmailForm && (
          <>
            <GoogleAuthButton label="Continuer avec Google" />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              variant="outline"
              className="h-11 w-full gap-2.5 rounded-full text-base"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="size-4.5" />
              Continuer avec email
            </Button>
          </>
        )}

        {(!hasExternalProvider || showEmailForm) && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                required
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                required
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={submitting} className="mt-2 h-11 w-full rounded-full text-base" size="lg">
              {t("submit")}
            </Button>

            {hasExternalProvider && (
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="text-center text-sm text-muted-foreground hover:text-foreground"
              >
                ← Retour
              </button>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
