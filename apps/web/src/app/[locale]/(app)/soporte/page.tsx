import { getTranslations } from "next-intl/server";
import { serverApiGet } from "@/lib/api-server";
import type { SupportTicketSummary } from "@/lib/types";
import { Reveal } from "@/components/reveal";
import { SupportClient } from "./support-client";

/** Soporte del usuario (anunciante o comerciante): abrir una solicitud y ver las suyas. */
export default async function SupportPage() {
  const t = await getTranslations("Support");
  const { data: tickets } = await serverApiGet<SupportTicketSummary[]>("/support/tickets");

  return (
    <div className="bg-mesh-panel mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Reveal>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </Reveal>
      <Reveal delay={80} className="mt-6 block">
        <SupportClient initialTickets={tickets ?? []} />
      </Reveal>
    </div>
  );
}
