import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, Reservation } from "@/lib/types";
import { ReservationCard } from "@/components/reservation-card";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";
import { CalendarCheck } from "lucide-react";

export default async function DashboardReservationsPage() {
  const locale = await getLocale();
  const t = await getTranslations("Reservations");

  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");
  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  if ((user as AuthUser).role !== UserRole.COMMERCANT) {
    redirect({ href: "/dashboard", locale });
  }

  const { data: reservations } = await serverApiGet<Reservation[]>("/reservations/received");

  return (
    <div className="bg-mesh-panel mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Reveal>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
      </Reveal>

      {(!reservations || reservations.length === 0) ? (
        <Reveal delay={80} className="mt-6 block">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <EmptyState icon={CalendarCheck} title={t("noneYet")} />
          </div>
        </Reveal>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {reservations.map((reservation, i) => (
            <Reveal key={reservation.id} delay={80 + i * 60}>
              <ReservationCard reservation={reservation} viewer="commercant" />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
