"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { UserRole, Country, Locale, type SupportedLocale } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import { useAuthProviders } from "@/lib/use-auth-providers";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { Store, Megaphone, ArrowLeft, Mail } from "lucide-react";

/** Rôles ouverts à l'inscription publique — reflète apps/api/.../register.dto.ts. */
type RegisterableRole = typeof UserRole.COMMERCANT | typeof UserRole.ANNONCEUR;

function isRegisterableRole(value: string | null): value is RegisterableRole {
  return value === UserRole.COMMERCANT || value === UserRole.ANNONCEUR;
}

function RoleCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Store;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-lift flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function RegisterForm() {
  const t = useTranslations("Auth.register");
  const tErrors = useTranslations("Auth.errors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRole = searchParams.get("role");
  const providers = useAuthProviders();
  // Langue de navigation courante -> langue préférée du compte (emails).
  // Séparé de SupportedLocale (préfixe d'URL, minuscules) : Locale est le
  // format stocké en base (majuscules, voir packages/shared).
  const uiLocale = useLocale() as SupportedLocale;
  const preferredLocale: Locale = uiLocale === "en" ? Locale.EN : Locale.ES;

  const [role, setRole] = useState<RegisterableRole | null>(
    isRegisterableRole(preselectedRole) ? preselectedRole : null,
  );
  // Google n'est proposé qu'à l'inscription ANNONCEUR (voir AuthService) :
  // le formulaire démarre replié pour ce rôle tant que l'email n'a pas
  // été explicitement choisi.
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessIdNumber, setBusinessIdNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(tErrors("passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post<{ user: AuthUser }>("/auth/register", {
        email,
        password,
        role,
        country: Country.ES,
        locale: preferredLocale,
        ...(role === UserRole.COMMERCANT
          ? { businessName, businessIdNumber, addressLine1, addressLine2: addressLine2 || undefined, city, postalCode }
          : { companyName: companyName || undefined }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!role) {
    return (
      <Card className="border-border/70 shadow-xl shadow-foreground/[0.04]">
        <CardHeader className="pb-2 text-center sm:text-left">
          <CardTitle className="font-heading text-3xl font-medium">{t("chooseRole")}</CardTitle>
          <CardDescription>
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              {t("loginLink")}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-4">
          <RoleCard
            icon={Store}
            title={t("roleCommercant")}
            description={t("roleCommercantDesc")}
            onClick={() => setRole(UserRole.COMMERCANT)}
          />
          <RoleCard
            icon={Megaphone}
            title={t("roleAnnonceur")}
            description={t("roleAnnonceurDesc")}
            onClick={() => setRole(UserRole.ANNONCEUR)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-xl shadow-foreground/[0.04]">
      <CardHeader>
        <button
          type="button"
          onClick={() => setRole(null)}
          className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t("chooseRole")}
        </button>
        <CardTitle className="font-heading text-3xl font-medium">
          {role === UserRole.COMMERCANT ? t("roleCommercant") : t("roleAnnonceur")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {role === UserRole.ANNONCEUR && providers?.googleEnabled && !showEmailForm && (
          <>
            <GoogleAuthButton role={UserRole.ANNONCEUR} label={t("signupWithGoogle")} />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {t("or")}
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              variant="outline"
              className="h-11 w-full gap-2.5 rounded-full text-base"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="size-4.5" />
              {t("continueWithEmail")}
            </Button>
          </>
        )}

        {(role === UserRole.COMMERCANT || !providers?.googleEnabled || showEmailForm) && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">{t("password")} (confirmation)</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {role === UserRole.COMMERCANT && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="businessName">{t("businessName")}</Label>
                <Input
                  id="businessName"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="businessIdNumber">{t("businessIdNumber")}</Label>
                <Input
                  id="businessIdNumber"
                  required
                  value={businessIdNumber}
                  onChange={(e) => setBusinessIdNumber(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="addressLine1">{t("addressLine1")}</Label>
                <Input
                  id="addressLine1"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="addressLine2">{t("addressLine2")}</Label>
                <Input id="addressLine2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
              </div>
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="city">{t("city")}</Label>
                  <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="postalCode">{t("postalCode")}</Label>
                  <Input
                    id="postalCode"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("verificationNote")}</p>
            </>
          )}

          {role === UserRole.ANNONCEUR && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="companyName">{t("companyName")}</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={submitting} className="mt-1 h-11 w-full rounded-full text-base" size="lg">
            {t("submit")}
          </Button>

          {role === UserRole.ANNONCEUR && providers?.googleEnabled && (
            <button
              type="button"
              onClick={() => setShowEmailForm(false)}
              className="text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {t("back")}
            </button>
          )}
        </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
