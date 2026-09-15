"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailContent() {
  const t = useTranslations("Auth.verifyEmail");
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <Card className="border-border/70 shadow-xl shadow-foreground/[0.04]">
      <CardHeader className="items-center text-center">
        {status === "loading" && <Loader2 className="size-10 animate-spin text-muted-foreground" />}
        {status === "success" && <CheckCircle2 className="size-10 text-primary" />}
        {status === "error" && <XCircle className="size-10 text-destructive" />}
        <CardTitle className="font-heading text-2xl font-medium">
          {status === "loading" && t("verifying")}
          {status === "success" && t("success")}
          {status === "error" && t("error")}
        </CardTitle>
      </CardHeader>
      {status === "success" && (
        <CardContent>
          {/* Pas un simple <Link> : le tableau de bord a probablement déjà été
              visité juste avant (l'alerte "email non vérifié" n'apparaît que
              dessus) — le cache de navigation client de Next.js pourrait
              resservir cette version obsolète. router.refresh() force le
              rechargement des données serveur (auth/me) après la navigation. */}
          <Button
            className="h-11 w-full rounded-full text-base"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            {t("goToDashboard")}
          </Button>
        </CardContent>
      )}
      {status === "error" && (
        <CardContent>
          <Button variant="outline" className="h-11 w-full rounded-full text-base" render={<Link href="/login" />}>
            {t("loginCta")}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
