import { getLocale, getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getDateLocale } from "@/lib/date-locale";
import type { AuthUser, StripeStatus, CommercantStats, AnnonceurStats, Reservation } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { RecentReservationsList } from "@/components/recent-reservations-list";
import { Wallet, CalendarCheck, Store, Clock, Search, TrendingUp, CheckCircle2 } from "lucide-react";
import { VerificationUpload } from "./verification-upload";
import { StripeConnectCard } from "./stripe-connect-card";
import { ResendVerificationButton } from "@/components/resend-verification-button";

/** Même mapping statut->libellé/variante que ReservationCard, construit ici pour l'aperçu compact du tableau de bord (composant serveur, pas de useTranslations). */
function buildStatusLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    PENDING_VALIDATION: { label: t("statusPendingResponse"), variant: "outline" as const },
    CONFIRMED: { label: t("statusConfirmed"), variant: "default" as const },
    ACTIVE: { label: t("statusActive"), variant: "default" as const },
    COMPLETED: { label: t("statusCompleted"), variant: "secondary" as const },
    CANCELLED_BY_ANNONCEUR: { label: t("statusCancelledByAnnonceur"), variant: "destructive" as const },
    CANCELLED_BY_COMMERCANT: { label: t("statusCancelledByCommercant"), variant: "destructive" as const },
    NO_SHOW: { label: t("statusNoShow"), variant: "destructive" as const },
    DISPUTE: { label: t("statusDispute"), variant: "destructive" as const },
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Dashboard");
  const tReservations = await getTranslations("Reservations");
  const params = await searchParams;
  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");

  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  const authedUser = user as AuthUser;

  if (authedUser.role === UserRole.ADMIN) {
    redirect({ href: "/admin", locale });
  }

  if (authedUser.role === UserRole.COMMERCANT) {
    return (
      <CommercantDashboard
        user={authedUser}
        stripeReturn={params.stripe === "return"}
        t={t}
        tReservations={tReservations}
        dateLocale={getDateLocale(locale)}
      />
    );
  }
  return <AnnonceurDashboard user={authedUser} t={t} tReservations={tReservations} dateLocale={getDateLocale(locale)} />;
}

async function CommercantDashboard({
  user,
  stripeReturn,
  t,
  tReservations,
  dateLocale,
}: {
  user: AuthUser;
  stripeReturn: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
  tReservations: Awaited<ReturnType<typeof getTranslations>>;
  dateLocale: string;
}) {
  const profile = user.commercantProfile;
  const [{ data: stats }, { data: stripeStatus }, { data: reservations }] = await Promise.all([
    serverApiGet<CommercantStats>("/commercants/me/stats"),
    serverApiGet<StripeStatus>("/commercants/me/stripe/status"),
    serverApiGet<Reservation[]>("/reservations/received"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-2xl font-medium">{t("greeting", { name: profile?.businessName ?? user.email })}</h1>
        <div className="mt-1.5 flex items-center gap-2">
          {profile?.verificationStatus === VerificationStatus.VERIFIED && (
            <Badge className="bg-green-600 text-white">✓ {t("verified")}</Badge>
          )}
          {profile?.verificationStatus === VerificationStatus.PENDING && (
            <Badge variant="outline">{t("pendingBadge")}</Badge>
          )}
          {profile?.verificationStatus === VerificationStatus.REJECTED && (
            <Badge variant="destructive">{t("rejectedBadge")}</Badge>
          )}
        </div>
      </div>

      {!user.emailVerified && (
        <Alert>
          <AlertDescription>
            {t("emailNotVerified")}
            <div>
              <ResendVerificationButton />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {profile?.verificationStatus === VerificationStatus.REJECTED && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("verificationRejected")}
            {profile.verificationNote ? ` ${profile.verificationNote}` : ""}
          </AlertDescription>
        </Alert>
      )}

      {profile && profile.verificationStatus !== VerificationStatus.VERIFIED && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("verificationCardTitle")}</CardTitle>
            <CardDescription>
              {profile.verificationDocumentUrl ? t("verificationPending") : t("verificationMissingDocument")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationUpload />
          </CardContent>
        </Card>
      )}

      {stripeStatus && <StripeConnectCard status={stripeStatus} justReturned={stripeReturn} />}

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Wallet} label={t("statTotalReceived")} value={`${stats.totalPayout.toFixed(0)} €`} tone="accent" />
          <StatCard icon={CalendarCheck} label={t("statActiveReservations")} value={stats.activeReservationsCount} />
          <StatCard icon={Clock} label={t("statPendingRequests")} value={stats.pendingRequestsCount} />
          <StatCard icon={Store} label={t("statPublishedSpaces")} value={stats.spacesCount} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RecentReservationsList
          title={t("recentRequests")}
          reservations={reservations ?? []}
          viewer="commercant"
          seeAllHref="/dashboard/reservations"
          seeAllLabel={t("seeAll")}
          emptyMessage={tReservations("noneYet")}
          statusLabels={buildStatusLabels(tReservations)}
          dateLocale={dateLocale}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" render={<Link href="/dashboard/vitrine" />}>
              <Store className="size-4" />
              {t("manageVitrine")}
            </Button>
            <Button variant="outline" className="justify-start" render={<Link href="/dashboard/reservations" />}>
              <CalendarCheck className="size-4" />
              {t("viewRequests")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function AnnonceurDashboard({
  user,
  t,
  tReservations,
  dateLocale,
}: {
  user: AuthUser;
  t: Awaited<ReturnType<typeof getTranslations>>;
  tReservations: Awaited<ReturnType<typeof getTranslations>>;
  dateLocale: string;
}) {
  const [{ data: stats }, { data: reservations }] = await Promise.all([
    serverApiGet<AnnonceurStats>("/annonceurs/me/stats"),
    serverApiGet<Reservation[]>("/reservations/me"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-2xl font-medium">
          {t("greeting", { name: user.annonceurProfile?.companyName ?? user.email })}
        </h1>
      </div>

      {!user.emailVerified && (
        <Alert>
          <AlertDescription>
            {t("emailNotVerified")}
            <div>
              <ResendVerificationButton />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={TrendingUp} label={t("statTotalSpent")} value={`${stats.totalSpent.toFixed(0)} €`} tone="accent" />
          <StatCard icon={CalendarCheck} label={t("statActiveReservations")} value={stats.activeReservationsCount} />
          <StatCard icon={Clock} label={t("statPending")} value={stats.pendingRequestsCount} />
          <StatCard icon={CheckCircle2} label={t("statCompleted")} value={stats.completedReservationsCount} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RecentReservationsList
          title={t("myRecentReservations")}
          reservations={reservations ?? []}
          viewer="annonceur"
          seeAllHref="/mes-reservations"
          seeAllLabel={t("seeAll")}
          emptyMessage={t("noReservationsYet")}
          statusLabels={buildStatusLabels(tReservations)}
          dateLocale={dateLocale}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button className="justify-start" render={<Link href="/recherche" />}>
              <Search className="size-4" />
              {t("searchCommerce")}
            </Button>
            <Button variant="outline" className="justify-start" render={<Link href="/mes-reservations" />}>
              <CalendarCheck className="size-4" />
              {t("allMyReservations")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
