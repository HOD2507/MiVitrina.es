import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getDateLocale } from "@/lib/date-locale";
import type { AuthUser, StripeStatus, CommercantStats, AnnonceurStats, Reservation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { StatsSummary } from "@/components/stats-summary";
import { RecentReservationsList } from "@/components/recent-reservations-list";
import { EmptyVitrineIllustration } from "@/components/empty-vitrine-illustration";
import { Reveal } from "@/components/reveal";
import {
  Wallet,
  CalendarCheck,
  Store,
  Clock,
  Search,
  TrendingUp,
  CheckCircle2,
  BadgeCheck,
  AlertCircle,
} from "lucide-react";
import { OnboardingChecklist } from "./onboarding-checklist";
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
    <div className="bg-mesh-panel mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t("greetingPrefix")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-4xl font-extrabold tracking-tight">
              {profile?.businessName ?? user.email}
            </h1>
            {profile?.verificationStatus === VerificationStatus.VERIFIED && (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="size-3.5" /> {t("verified")}
              </Badge>
            )}
            {profile?.verificationStatus === VerificationStatus.PENDING && (
              <Badge variant="outline" className="gap-1 rounded-full">
                <Clock className="size-3.5" /> {t("pendingBadge")}
              </Badge>
            )}
            {profile?.verificationStatus === VerificationStatus.REJECTED && (
              <Badge variant="destructive" className="gap-1 rounded-full">
                <AlertCircle className="size-3.5" /> {t("rejectedBadge")}
              </Badge>
            )}
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <OnboardingChecklist
          t={t}
          emailVerified={user.emailVerified}
          verificationStatus={profile?.verificationStatus}
          verificationDocumentUrl={profile?.verificationDocumentUrl}
          verificationNote={profile?.verificationNote}
          stripeStatus={stripeStatus ?? { connected: false, onboardingComplete: false }}
          stripeJustReturned={stripeReturn}
        />
      </Reveal>

      {stats && (
        <Reveal delay={160}>
          <StatsSummary
            items={[
              { icon: Wallet, label: t("statTotalReceived"), value: `${stats.totalPayout.toFixed(0)} €`, tone: "primary" },
              { icon: CalendarCheck, label: t("statActiveReservations"), value: stats.activeReservationsCount, tone: "amber" },
              { icon: Clock, label: t("statPendingRequests"), value: stats.pendingRequestsCount, tone: "plum" },
              { icon: Store, label: t("statPublishedSpaces"), value: stats.spacesCount, tone: "muted" },
            ]}
          />
        </Reveal>
      )}

      <Reveal delay={240}>
        <RecentReservationsList
          title={t("recentRequests")}
          reservations={reservations ?? []}
          viewer="commercant"
          seeAllHref="/dashboard/reservations"
          seeAllLabel={t("seeAll")}
          emptyMessage={tReservations("noneYet")}
          emptyIllustration={<EmptyVitrineIllustration className="h-20 w-24 text-muted-foreground" />}
          emptyCtaHref="/dashboard/vitrine"
          emptyCtaLabel={t("manageVitrine")}
          statusLabels={buildStatusLabels(tReservations)}
          dateLocale={dateLocale}
        />
      </Reveal>
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
    <div className="bg-mesh-panel mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t("greetingPrefix")}</p>
          <h1 className="mt-1 font-heading text-4xl font-extrabold tracking-tight">
            {user.annonceurProfile?.companyName ?? user.email}
          </h1>
        </div>
      </Reveal>

      {!user.emailVerified && (
        <Reveal delay={80}>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm">{t("emailNotVerified")}</p>
            <ResendVerificationButton />
          </div>
        </Reveal>
      )}

      {stats && (
        <Reveal delay={160}>
          <StatsSummary
            items={[
              { icon: TrendingUp, label: t("statTotalSpent"), value: `${stats.totalSpent.toFixed(0)} €`, tone: "primary" },
              { icon: CalendarCheck, label: t("statActiveReservations"), value: stats.activeReservationsCount, tone: "amber" },
              { icon: Clock, label: t("statPending"), value: stats.pendingRequestsCount, tone: "plum" },
              { icon: CheckCircle2, label: t("statCompleted"), value: stats.completedReservationsCount, tone: "muted" },
            ]}
          />
        </Reveal>
      )}

      <Reveal delay={240}>
        <RecentReservationsList
          title={t("myRecentReservations")}
          reservations={reservations ?? []}
          viewer="annonceur"
          seeAllHref="/mes-reservations"
          seeAllLabel={t("seeAll")}
          emptyMessage={t("noReservationsYet")}
          emptyIcon={Search}
          emptyCtaHref="/recherche"
          emptyCtaLabel={t("searchCommerce")}
          statusLabels={buildStatusLabels(tReservations)}
          dateLocale={dateLocale}
        />
      </Reveal>
    </div>
  );
}
