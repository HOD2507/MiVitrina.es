import { notFound } from "next/navigation";
import { serverApiGet } from "@/lib/api-server";
import type { SupportTicketDetail } from "@/lib/types";
import { TicketDetailClient } from "./ticket-detail-client";

/** Hilo de una solicitud de soporte. Abrirlo (GET) la marca como leída en la API. */
export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: ticket } = await serverApiGet<SupportTicketDetail>(`/support/tickets/${id}`);
  if (!ticket) notFound();

  return (
    <div className="bg-mesh-panel mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <TicketDetailClient initialTicket={ticket} />
    </div>
  );
}
