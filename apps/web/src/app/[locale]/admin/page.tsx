import { getTranslations } from "next-intl/server";
import { Store, Megaphone, ShieldCheck, ShieldAlert, CalendarCheck, Euro } from "lucide-react";
import { serverApiGet } from "@/lib/api-server";
import type { AdminStats } from "@/lib/types";
import { StatsSummary } from "@/components/stats-summary";
import { Reveal } from "@/components/reveal";

export default async function AdminOverviewPage() {
  const t = await getTranslations("Admin.overview");
  const { data: stats } = await serverApiGet<AdminStats>("/admin/stats");

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>

      {stats && (
        <Reveal delay={80}>
          <StatsSummary
            items={[
              { icon: Store, label: t("statCommercants"), value: stats.totalCommercants, tone: "primary" },
              { icon: Megaphone, label: t("statAnnonceurs"), value: stats.totalAnnonceurs, tone: "amber" },
              {
                icon: ShieldCheck,
                label: t("statPendingVerifications"),
                value: stats.pendingVerifications,
                tone: stats.pendingVerifications > 0 ? "plum" : "muted",
              },
              {
                icon: ShieldAlert,
                label: t("statOpenDisputes"),
                value: stats.openDisputes,
                tone: stats.openDisputes > 0 ? "plum" : "muted",
              },
              { icon: CalendarCheck, label: t("statActiveReservations"), value: stats.activeReservations, tone: "amber" },
              {
                icon: Euro,
                label: t("statCommission"),
                value: `${stats.totalCommissionRevenue.toFixed(2)} €`,
                tone: "primary",
              },
            ]}
          />
        </Reveal>
      )}
    </div>
  );
}
