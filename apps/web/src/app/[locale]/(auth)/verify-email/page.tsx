"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailContent() {
  const t = useTranslations("Auth.verifyEmail");
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
          <Button className="h-11 w-full rounded-full text-base" render={<Link href="/dashboard" />}>
            {t("goToDashboard")}
          </Button>
        </CardContent>
      )}
      {status === "error" && (
        <CardContent>
          <Button variant="outline" className="h-11 w-full rounded-full text-base" render={<Link href="/login" />}>
            Se connecter
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
