"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const t = useTranslations("Auth.resetPassword");
  const tErrors = useTranslations("Auth.errors");
  const token = useSearchParams().get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(tErrors("passwordMismatch"));
      return;
    }
    if (!token) {
      setError(t("invalidToken"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-border/70 shadow-xl shadow-foreground/[0.04]">
      <CardHeader className="pb-2 text-center sm:text-left">
        <CardTitle className="font-heading text-3xl font-medium">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {success ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="size-10 text-primary" />
            <p className="text-sm text-muted-foreground">{t("success")}</p>
            <Button className="h-11 w-full rounded-full text-base" render={<Link href="/login" />}>
              {t("goToLogin")}
            </Button>
          </div>
        ) : !token ? (
          <Alert variant="destructive">
            <AlertDescription>{t("invalidToken")}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">{t("newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                required
                minLength={8}
                className="h-11"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                className="h-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={submitting} className="h-11 w-full rounded-full text-base" size="lg">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t("submit")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
