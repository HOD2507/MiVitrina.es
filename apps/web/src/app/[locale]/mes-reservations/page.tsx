import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, Reservation } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { ReservationCard } from "@/components/reservation-card";
import { PaymentStatusToast } from "./payment-status-toast";

export default async function MesReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const locale = await getLocale();
  const params = await searchParams;

  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");
  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  if ((user as AuthUser).role !== UserRole.ANNONCEUR) {
    redirect({ href: "/dashboard", locale });
  }

  const { data: reservations } = await serverApiGet<Reservation[]>("/reservations/me");

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader />
      <PaymentStatusToast payment={params.payment} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Mes réservations</h1>

        {(!reservations || reservations.length === 0) && (
          <p className="text-muted-foreground">Vous n'avez pas encore de réservation.</p>
        )}

        <div className="flex flex-col gap-4">
          {reservations?.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} viewer="annonceur" />
          ))}
        </div>
      </main>
    </div>
  );
}
