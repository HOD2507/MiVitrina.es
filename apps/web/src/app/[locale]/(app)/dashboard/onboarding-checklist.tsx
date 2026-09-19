import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Mail, ShieldCheck, CreditCard } from "lucide-react";
import { VerificationStatus } from "@mivitrina/shared";
import { cn } from "cn";
import type { StripeStatus } from "@/lib/types";
import { ResendVerificationButton } from "@/components/resend-verification-button";
import { VerificationUpload } from "./verification-upload";
import { StripeConnectAction } from "./stripe-connect-card";

interface OnboardingChecklistProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  emailVerified: boolean;
  verificationStatus?: VerificationStatus;
  verificationDocumentUrl?: string | null;
  verificationNote?: string | null;
  stripeStatus: StripeStatus;
  stripeJustReturned: boolean;
}

function ChecklistRow({
  icon: Icon,
  title,
  desc,
  critical,
  children,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  /** L'étape Stripe : sans elle, aucune réservation payante n'est possible — un fond teinté et un bouton plus présent la distinguent des deux autres. */
  critical?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "-mx-3 flex flex-col gap-3 rounded-xl px-3 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        critical ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/50",
      )}
    >
      <div className="flex gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm",
            critical
              ? "bg-gradient-to-br from-primary to-glow-amber text-primary-foreground"
              : "bg-gradient-to-br from-primary/15 to-glow-amber/25 text-primary",
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 max-w-md text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="pl-12 sm:shrink-0 sm:pl-0">{children}</div>
    </div>
  );
}

/**
 * Les trois étapes de mise en route (email, justificatif NIF/CIF, Stripe)
 * réunies dans UNE section à lignes, plutôt que trois cartes empilées
 * (retour utilisateur : "evita hacer cajas por todos lados"). Une barre de
 * progression en tête ("1 sur 3") donne une vraie sensation de checklist
 * plutôt que du texte informatif — et la section disparaît d'elle-même
 * dès que tout est fait.
 */
export function OnboardingChecklist({
  t,
  emailVerified,
  verificationStatus,
  verificationDocumentUrl,
  verificationNote,
  stripeStatus,
  stripeJustReturned,
}: OnboardingChecklistProps) {
  const businessVerified = verificationStatus === VerificationStatus.VERIFIED;
  const steps = [emailVerified, businessVerified, stripeStatus.onboardingComplete];
  const doneCount = steps.filter(Boolean).length;
  const allDone = doneCount === steps.length;
  if (allDone) return null;

  return (
    <div className="spotlight-hover rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-bold">{t("onboardingTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("onboardingSubtitle")}</p>
        </div>
        <p className="shrink-0 text-sm font-medium text-primary">
          {t("onboardingProgress", { done: doneCount, total: steps.length })}
        </p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-glow-amber transition-[width] duration-500 ease-out"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="mt-4 flex flex-col divide-y divide-border/70">
        {!emailVerified && (
          <ChecklistRow icon={Mail} title={t("emailStepTitle")} desc={t("emailNotVerified")}>
            <ResendVerificationButton />
          </ChecklistRow>
        )}

        {!businessVerified && (
          <ChecklistRow
            icon={ShieldCheck}
            title={t("verificationCardTitle")}
            desc={
              verificationStatus === VerificationStatus.REJECTED
                ? `${t("verificationRejected")}${verificationNote ? ` ${verificationNote}` : ""}`
                : verificationDocumentUrl
                  ? t("verificationPending")
                  : t("verificationMissingDocument")
            }
          >
            <VerificationUpload />
          </ChecklistRow>
        )}

        {!stripeStatus.onboardingComplete && (
          <ChecklistRow
            icon={CreditCard}
            title={t("paymentsTitle")}
            desc={stripeStatus.connected ? t("stripeIncompleteDesc") : t("stripeMissingDesc")}
            critical
          >
            <StripeConnectAction status={stripeStatus} justReturned={stripeJustReturned} size="lg" />
          </ChecklistRow>
        )}
      </div>
    </div>
  );
}
