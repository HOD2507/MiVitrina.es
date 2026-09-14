import { Store, Megaphone, ShieldAlert, ShieldCheck, CalendarCheck, Euro } from "lucide-react";
import { serverApiGet } from "@/lib/api-server";
import type { AdminStats } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CARDS = [
  { key: "totalCommercants" as const, label: "Commerçants", icon: Store },
  { key: "totalAnnonceurs" as const, label: "Annonceurs", icon: Megaphone },
  { key: "pendingVerifications" as const, label: "Vérifications en attente", icon: ShieldCheck, alert: true },
  { key: "openDisputes" as const, label: "Litiges ouverts", icon: ShieldAlert, alert: true },
  { key: "activeReservations" as const, label: "Réservations en cours", icon: CalendarCheck },
];

export default async function AdminOverviewPage() {
  const { data: stats } = await serverApiGet<AdminStats>("/admin/stats");

  if (!stats) {
    return <p className="text-muted-foreground">Impossible de charger les statistiques.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {CARDS.map(({ key, label, icon: Icon, alert }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className={`size-4 ${alert && stats[key] > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${alert && stats[key] > 0 ? "text-destructive" : ""}`}>{stats[key]}</p>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Commission perçue</CardTitle>
          <Euro className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.totalCommissionRevenue.toFixed(2)} €</p>
        </CardContent>
      </Card>
    </div>
  );
}
