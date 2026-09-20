import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { BackLink } from "@/components/back-link";
import { ReserverClient } from "./reserver-client";

interface SearchParams {
  spaceId?: string;
  pricingOptionId?: string;
  businessName?: string;
  spaceName?: string;
  durationType?: string;
  price?: string;
  minDurationDays?: string;
}

/** Page de réservation — réservée aux annonceurs (redirige sinon). */
export default async function ReserverPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale();
  const t = await getTranslations("Reservations");
  const tVitrine = await getTranslations("Vitrine");
  const params = await searchParams;

  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");
  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  if ((user as AuthUser).role !== UserRole.ANNONCEUR) {
    redirect({ href: "/dashboard", locale });
  }

  if (!params.spaceId || !params.pricingOptionId) {
    redirect({ href: "/recherche", locale });
  }

  return (
    <div className="bg-mesh-panel flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
        <BackLink href="/recherche" label={tVitrine("backToResults")} />

        <div className="mt-5 mb-8">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {t("bookEyebrow")}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{t("bookTitle")}</h1>
          <p className="mt-1.5 text-muted-foreground">
            {params.businessName} — {params.spaceName}
          </p>
        </div>

        <ReserverClient
          spaceId={params.spaceId!}
          pricingOptionId={params.pricingOptionId!}
          businessName={params.businessName ?? ""}
          spaceName={params.spaceName ?? ""}
          durationType={(params.durationType as "SEMAINE" | "MOIS" | "LIBRE") ?? "SEMAINE"}
          price={params.price ?? "0"}
          minDurationDays={params.minDurationDays ? Number(params.minDurationDays) : null}
        />
      </main>
    </div>
  );
}
