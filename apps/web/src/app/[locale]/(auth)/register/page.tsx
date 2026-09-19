"use client";

import { Suspense, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
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
import { EmailField } from "@/components/email-field";
import { PasswordField } from "@/components/password-field";
import { TaxIdField } from "@/components/tax-id-field";
import { isValidSpanishTaxId } from "@/lib/spanish-tax-id";
import { withTimeout } from "@/lib/with-timeout";
import { StepWizard } from "@/components/step-wizard";
import { Store, Megaphone, ArrowLeft, Mail, User, Building2 } from "lucide-react";

/** Inscription commerçant en 4 étapes (compte / particulier ou entreprise / commerce / adresse) — voir StepWizard. */
const COMMERCANT_STEPS = 4;

/** Filet de sécurité pour la vérification en arrière-plan (voir
 * runBackgroundCheck) : évite qu'une requête réseau bloquée reste
 * indéfiniment "en vol" — sans effet sur la vitesse ressentie puisqu'elle
 * ne retarde plus l'avancée du formulaire. */
const STEP_CHECK_TIMEOUT_MS = 5000;

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
  const tStep = useTranslations("Auth.step");
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

  // Détermine juste le libellé/l'exemple affichés pour le NIF/CIF (étape
  // suivante) — la structure NIF/CIF elle-même ne dépend pas de ce choix
  // côté API (voir BUSINESS_ID_TYPE_BY_COUNTRY, un seul type "NIF_CIF" pour l'Espagne).
  const [commercantIsCompany, setCommercantIsCompany] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessIdNumber, setBusinessIdNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  // "Razón social" n'a de sens que pour une entreprise — un particulier
  // peut aussi être annonceur (voir AnnonceurProfile.companyName, optionnel).
  const [annonceurIsCompany, setAnnonceurIsCompany] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formulaire commerçant en plusieurs étapes (compte / commerce /
  // adresse) plutôt qu'un unique long formulaire — voir StepWizard.
  const [step, setStep] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const businessNameRef = useRef<HTMLInputElement>(null);
  const businessIdNumberRef = useRef<HTMLInputElement>(null);

  /**
   * Validation strictement locale (aucun appel réseau) avant de passer à
   * l'étape suivante — `reportValidity()` déclenche les bulles natives du
   * navigateur sur les champs invalides. Instantanée : demande explicite
   * de l'utilisateur, plus aucune latence perceptible en cliquant "Suivant".
   */
  function validateStepLocal(current: number): boolean {
    setError(null);
    if (current === 0) {
      if (!emailRef.current?.reportValidity()) return false;
      if (!passwordRef.current?.reportValidity()) return false;
      if (!confirmPasswordRef.current?.reportValidity()) return false;
      if (password !== confirmPassword) {
        setError(tErrors("passwordMismatch"));
        confirmPasswordRef.current?.focus();
        return false;
      }
      return true;
    }
    if (current === 2) {
      if (!businessNameRef.current?.reportValidity()) return false;
      if (!businessIdNumberRef.current?.reportValidity()) return false;
      if (!isValidSpanishTaxId(businessIdNumber)) {
        setError(tErrors("invalidBusinessId"));
        businessIdNumberRef.current?.focus();
        return false;
      }
      return true;
    }
    return true;
  }

  /**
   * Vérifications serveur (email déjà pris, NIF/CIF déjà pris) lancées
   * APRÈS être passé à l'étape suivante, jamais avant — demande explicite
   * de l'utilisateur : plus aucune attente avant d'avancer. Si l'une
   * échoue, on revient sur l'étape concernée et on affiche l'erreur là où
   * elle s'applique, au lieu de la découvrir seulement à la soumission finale.
   * Reçoit les valeurs au moment du clic (pas `email`/`businessIdNumber`
   * depuis le closure) pour rester correcte même si l'utilisateur a déjà
   * changé de champ pendant que la requête était en vol.
   */
  async function runBackgroundCheck(leftStep: number, emailAtClick: string, businessIdAtClick: string) {
    try {
      if (leftStep === 0) {
        const { deliverable, available } = await withTimeout(
          api.get<{ deliverable: boolean; available: boolean }>(
            `/auth/check-email?email=${encodeURIComponent(emailAtClick)}`,
          ),
          STEP_CHECK_TIMEOUT_MS,
        );
        if (!deliverable || !available) {
          setStep(0);
          setError(!deliverable ? tErrors("emailDomainNotDeliverable") : tErrors("emailAlreadyUsed"));
          emailRef.current?.focus();
        }
      } else if (leftStep === 2) {
        const { available } = await withTimeout(
          api.get<{ available: boolean }>(
            `/auth/check-business-id?country=${Country.ES}&businessIdNumber=${encodeURIComponent(businessIdAtClick)}`,
          ),
          STEP_CHECK_TIMEOUT_MS,
        );
        if (!available) {
          setStep(2);
          setError(tErrors("businessIdAlreadyUsed"));
          businessIdNumberRef.current?.focus();
        }
      }
    } catch {
      // Vérification indisponible ou trop lente (API en panne, réseau...) :
      // on ne fait rien de plus — l'erreur réelle serait de toute façon
      // rattrapée à la soumission finale.
    }
  }

  function handleNextStep() {
    if (!validateStepLocal(step)) return;
    const leftStep = step;
    setStep((s) => Math.min(s + 1, COMMERCANT_STEPS - 1));
    void runBackgroundCheck(leftStep, email, businessIdNumber);
  }

  function handlePreviousStep() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  /** Enter dans un champ ne doit avancer d'étape (ou ne rien faire) que
   * tant qu'on n'est pas sur la dernière étape — sinon le navigateur
   * tenterait une soumission native prématurée du formulaire entier
   * (et validerait au passage des champs pas encore affichés). */
  function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || role !== UserRole.COMMERCANT) return;
    if (step < COMMERCANT_STEPS - 1) {
      e.preventDefault();
      handleNextStep();
    }
  }

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
          : { companyName: annonceurIsCompany ? companyName : undefined }),
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
            onClick={() => {
              setStep(0);
              setRole(UserRole.COMMERCANT);
            }}
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
        {role === UserRole.COMMERCANT && (
          <div className="pt-2">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {tStep("indicator", { current: step + 1, total: COMMERCANT_STEPS })}
            </p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${((step + 1) / COMMERCANT_STEPS) * 100}%` }}
              />
            </div>
          </div>
        )}
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

        {role === UserRole.COMMERCANT && (
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex flex-col gap-4">
            <StepWizard step={step}>
              {[
                <div key="step-credentials" className="flex flex-col gap-4">
                  <EmailField
                    ref={emailRef}
                    id="email"
                    label={t("email")}
                    required
                    checkAvailability
                    value={email}
                    onChange={setEmail}
                  />
                  <PasswordField
                    ref={passwordRef}
                    id="password"
                    label={t("password")}
                    required
                    minLength={8}
                    value={password}
                    onChange={setPassword}
                    hint={t("passwordHint")}
                    toggleAriaLabel={t("togglePasswordVisibility")}
                  />
                  <PasswordField
                    ref={confirmPasswordRef}
                    id="confirmPassword"
                    label={`${t("password")} (confirmation)`}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    toggleAriaLabel={t("togglePasswordVisibility")}
                  />
                </div>,

                <div key="step-type" className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("commercantTypeLabel")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCommercantIsCompany(false)}
                        aria-pressed={!commercantIsCompany}
                        className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ${
                          !commercantIsCompany
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <User className="size-4" />
                        {t("commercantTypeIndividual")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommercantIsCompany(true)}
                        aria-pressed={commercantIsCompany}
                        className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ${
                          commercantIsCompany
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Building2 className="size-4" />
                        {t("commercantTypeCompany")}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("commercantTypeHint")}</p>
                  </div>
                </div>,

                <div key="step-business" className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="businessName">{t("businessName")}</Label>
                    <Input
                      ref={businessNameRef}
                      id="businessName"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                  <TaxIdField
                    ref={businessIdNumberRef}
                    id="businessIdNumber"
                    label={commercantIsCompany ? t("businessIdNumberCompanyLabel") : t("businessIdNumberIndividualLabel")}
                    required
                    country={Country.ES}
                    hint={commercantIsCompany ? t("businessIdNumberCompanyHint") : t("businessIdNumberIndividualHint")}
                    placeholder={commercantIsCompany ? "B12345674" : "12345678Z"}
                    value={businessIdNumber}
                    onChange={setBusinessIdNumber}
                  />
                </div>,

                <div key="step-address" className="flex flex-col gap-4">
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
                </div>,
              ]}
            </StepWizard>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-1 flex gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-full text-base"
                  size="lg"
                  onClick={handlePreviousStep}
                >
                  {tStep("previous")}
                </Button>
              )}
              {step < COMMERCANT_STEPS - 1 ? (
                <Button type="button" className="h-11 flex-1 rounded-full text-base" size="lg" onClick={handleNextStep}>
                  {tStep("next")}
                </Button>
              ) : (
                <Button type="submit" disabled={submitting} className="h-11 flex-1 rounded-full text-base" size="lg">
                  {t("submit")}
                </Button>
              )}
            </div>
          </form>
        )}

        {role === UserRole.ANNONCEUR && (!providers?.googleEnabled || showEmailForm) && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <EmailField id="email" label={t("email")} required checkAvailability value={email} onChange={setEmail} />

            <PasswordField
              id="password"
              label={t("password")}
              required
              minLength={8}
              value={password}
              onChange={setPassword}
              hint={t("passwordHint")}
              toggleAriaLabel={t("togglePasswordVisibility")}
            />

            <PasswordField
              id="confirmPassword"
              label={`${t("password")} (confirmation)`}
              required
              minLength={8}
              value={confirmPassword}
              onChange={setConfirmPassword}
              toggleAriaLabel={t("togglePasswordVisibility")}
            />

            {/* Un particulier peut aussi être annonceur (voir AnnonceurProfile.companyName,
                optionnel) — la "raison sociale" ne s'affiche donc que si l'option "Empresa"
                est choisie, plutôt qu'un unique champ texte toujours visible. */}
            <div className="flex flex-col gap-1.5">
              <Label>{t("annonceurTypeLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAnnonceurIsCompany(false)}
                  aria-pressed={!annonceurIsCompany}
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ${
                    !annonceurIsCompany
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="size-4" />
                  {t("annonceurTypeParticular")}
                </button>
                <button
                  type="button"
                  onClick={() => setAnnonceurIsCompany(true)}
                  aria-pressed={annonceurIsCompany}
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ${
                    annonceurIsCompany
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="size-4" />
                  {t("annonceurTypeCompany")}
                </button>
              </div>
            </div>

            {annonceurIsCompany && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="companyName">{t("companyName")}</Label>
                <Input id="companyName" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
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

            {providers?.googleEnabled && (
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
