import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
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
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
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
