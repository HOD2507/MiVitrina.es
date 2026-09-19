import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { AdminReservationListItem } from "@/lib/types";
import { AdminReservationsClient } from "./reservations-client";

export default async function AdminReservationsPage() {
  const userPromise = getAdminUser();
  const reservationsPromise = serverApiGet<AdminReservationListItem[]>("/admin/reservations");

  await requireAdminPermission(userPromise, AdminPermission.FINANCE_VIEW);
  const { data: reservations } = await reservationsPromise;

  return <AdminReservationsClient initialReservations={reservations ?? []} />;
}
