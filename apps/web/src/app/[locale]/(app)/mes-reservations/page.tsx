import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, Reservation } from "@/lib/types";
import { ReservationCard } from "@/components/reservation-card";
import { PaymentStatusToast } from "./payment-status-toast";

export default async function MesReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Reservations");
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
    <>
      <PaymentStatusToast payment={params.payment} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <h1 className="mb-6 text-2xl font-medium">{t("myBookingsPageTitle")}</h1>

        {(!reservations || reservations.length === 0) && (
          <p className="text-muted-foreground">{t("noneYet")}</p>
        )}

        <div className="flex flex-col gap-4">
          {reservations?.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} viewer="annonceur" />
          ))}
        </div>
      </main>
    </>
  );
}
