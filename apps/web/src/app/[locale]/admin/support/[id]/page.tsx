import { notFound } from "next/navigation";
import { AdminPermission, hasAdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { AdminSupportTicketDetail } from "@/lib/types";
import { TicketAdminClient } from "./ticket-admin-client";

export default async function AdminSupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userPromise = getAdminUser();
  const ticketPromise = serverApiGet<AdminSupportTicketDetail>(`/admin/support/tickets/${id}`);

  const admin = await requireAdminPermission(userPromise, AdminPermission.SUPPORT_MANAGE);
  const { data: ticket } = await ticketPromise;
  if (!ticket) notFound();

  return (
    <TicketAdminClient
      initialTicket={ticket}
      // La ficha del usuario (con todas sus reservas) exige users.view; se enlaza solo si este admin puede abrirla.
      canViewUser={hasAdminPermission(admin.adminLevel, AdminPermission.USERS_VIEW)}
    />
  );
}
