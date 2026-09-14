import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, Reservation } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { ReservationCard } from "@/components/reservation-card";

export default async function DashboardReservationsPage() {
  const locale = await getLocale();

  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");
  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  if ((user as AuthUser).role !== UserRole.COMMERCANT) {
    redirect({ href: "/dashboard", locale });
  }

  const { data: reservations } = await serverApiGet<Reservation[]>("/reservations/received");

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Demandes de réservation</h1>

        {(!reservations || reservations.length === 0) && (
          <p className="text-muted-foreground">Aucune demande de réservation pour le moment.</p>
        )}

        <div className="flex flex-col gap-4">
          {reservations?.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} viewer="commercant" />
          ))}
        </div>
      </main>
    </div>
  );
}
