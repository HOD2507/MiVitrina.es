import { getLocale, getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, StripeStatus } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Store, CalendarCheck, Search } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { VerificationUpload } from "./verification-upload";
import { StripeConnectCard } from "./stripe-connect-card";

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Administrateur",
  [UserRole.COMMERCANT]: "Commerçant",
  [UserRole.ANNONCEUR]: "Annonceur",
};

/**
 * Dashboard générique post-connexion — placeholder en attendant les
 * dashboards dédiés par rôle (ADMIN/ANNONCEUR/COMMERCANT) à l'étape "pages".
 * Protection : Server Component, redirige vers /login si /auth/me échoue.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  const t = await getTranslations("Dashboard");
  const params = await searchParams;
  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");

  if (status === 401 || !user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  const authedUser = user as AuthUser;
  const commercantProfile = authedUser.commercantProfile;

  let stripeStatus: StripeStatus | null = null;
  if (authedUser.role === UserRole.COMMERCANT) {
    const res = await serverApiGet<StripeStatus>("/commercants/me/stripe/status");
    stripeStatus = res.data ?? { connected: false, onboardingComplete: false };
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-xl break-words">{t("welcome", { email: authedUser.email })}</CardTitle>
              <CardDescription className="mt-1">
                <Badge variant="secondary">{ROLE_LABELS[authedUser.role]}</Badge>
              </CardDescription>
            </div>
            <LogoutButton />
          </CardHeader>
        </Card>

        {!authedUser.emailVerified && (
          <Alert>
            <AlertDescription>{t("emailNotVerified")}</AlertDescription>
          </Alert>
        )}

        {authedUser.role === UserRole.COMMERCANT && commercantProfile && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                {commercantProfile.businessName}
                {commercantProfile.verificationStatus === VerificationStatus.VERIFIED && (
                  <Badge className="bg-green-600 text-white">✓ {t("verified")}</Badge>
                )}
                {commercantProfile.verificationStatus === VerificationStatus.PENDING && (
                  <Badge variant="outline">{t("pendingBadge")}</Badge>
                )}
                {commercantProfile.verificationStatus === VerificationStatus.REJECTED && (
                  <Badge variant="destructive">{t("rejectedBadge")}</Badge>
                )}
              </CardTitle>
              <Button size="sm" variant="outline" render={<Link href="/dashboard/vitrine" />}>
                <Store className="size-4" />
                Ma vitrine
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button size="sm" variant="outline" className="self-start" render={<Link href="/dashboard/reservations" />}>
                <CalendarCheck className="size-4" />
                Demandes de réservation
              </Button>

              {commercantProfile.verificationStatus === VerificationStatus.REJECTED && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {t("verificationRejected")}
                    {commercantProfile.verificationNote ? ` ${commercantProfile.verificationNote}` : ""}
                  </AlertDescription>
                </Alert>
              )}

              {commercantProfile.verificationStatus === VerificationStatus.PENDING && (
                <Alert>
                  <AlertDescription>
                    {commercantProfile.verificationDocumentUrl
                      ? t("verificationPending")
                      : t("verificationMissingDocument")}
                  </AlertDescription>
                </Alert>
              )}

              {commercantProfile.verificationStatus !== VerificationStatus.VERIFIED && <VerificationUpload />}
            </CardContent>
          </Card>
        )}

        {authedUser.role === UserRole.COMMERCANT && stripeStatus && (
          <StripeConnectCard status={stripeStatus} justReturned={params.stripe === "return"} />
        )}

        {authedUser.role === UserRole.ANNONCEUR && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vos annonces</CardTitle>
              <CardDescription>Trouvez un commerce ou suivez vos demandes de réservation.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" render={<Link href="/recherche" />}>
                <Search className="size-4" />
                Rechercher un commerce
              </Button>
              <Button size="sm" variant="outline" render={<Link href="/mes-reservations" />}>
                <CalendarCheck className="size-4" />
                Mes réservations
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
