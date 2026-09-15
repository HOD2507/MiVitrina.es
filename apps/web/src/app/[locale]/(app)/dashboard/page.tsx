import { getLocale, getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
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

  if (authedUser.role === UserRole.ADMIN) {
    const locale = await getLocale();
    redirect({ href: "/admin", locale });
  }

  if (authedUser.role === UserRole.COMMERCANT) {
    return <CommercantDashboard user={authedUser} stripeReturn={params.stripe === "return"} t={t} />;
  }
  return <AnnonceurDashboard user={authedUser} t={t} />;
}

async function CommercantDashboard({
  user,
  stripeReturn,
  t,
}: {
  user: AuthUser;
  stripeReturn: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
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
        <h1 className="text-2xl font-medium">Bonjour, {profile?.businessName ?? user.email}</h1>
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
          <AlertDescription>{t("emailNotVerified")}</AlertDescription>
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
            <CardTitle className="text-lg">Vérification de votre commerce</CardTitle>
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
          <StatCard icon={Wallet} label="Reçu au total" value={`${stats.totalPayout.toFixed(0)} €`} tone="accent" />
          <StatCard icon={CalendarCheck} label="Réservations en cours" value={stats.activeReservationsCount} />
          <StatCard icon={Clock} label="Demandes en attente" value={stats.pendingRequestsCount} />
          <StatCard icon={Store} label="Espaces publiés" value={stats.spacesCount} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RecentReservationsList
          title="Demandes récentes"
          reservations={reservations ?? []}
          viewer="commercant"
          seeAllHref="/dashboard/reservations"
          emptyMessage="Aucune demande de réservation pour le moment."
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" render={<Link href="/dashboard/vitrine" />}>
              <Store className="size-4" />
              Gérer ma vitrine
            </Button>
            <Button variant="outline" className="justify-start" render={<Link href="/dashboard/reservations" />}>
              <CalendarCheck className="size-4" />
              Voir les demandes
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
}: {
  user: AuthUser;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const [{ data: stats }, { data: reservations }] = await Promise.all([
    serverApiGet<AnnonceurStats>("/annonceurs/me/stats"),
    serverApiGet<Reservation[]>("/reservations/me"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-2xl font-medium">
          Bonjour, {user.annonceurProfile?.companyName ?? user.email}
        </h1>
      </div>

      {!user.emailVerified && (
        <Alert>
          <AlertDescription>{t("emailNotVerified")}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={TrendingUp} label="Dépensé au total" value={`${stats.totalSpent.toFixed(0)} €`} tone="accent" />
          <StatCard icon={CalendarCheck} label="Réservations en cours" value={stats.activeReservationsCount} />
          <StatCard icon={Clock} label="En attente" value={stats.pendingRequestsCount} />
          <StatCard icon={CheckCircle2} label="Terminées" value={stats.completedReservationsCount} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RecentReservationsList
          title="Mes réservations récentes"
          reservations={reservations ?? []}
          viewer="annonceur"
          seeAllHref="/mes-reservations"
          emptyMessage="Vous n'avez pas encore de réservation."
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button className="justify-start" render={<Link href="/recherche" />}>
              <Search className="size-4" />
              Rechercher un commerce
            </Button>
            <Button variant="outline" className="justify-start" render={<Link href="/mes-reservations" />}>
              <CalendarCheck className="size-4" />
              Toutes mes réservations
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
