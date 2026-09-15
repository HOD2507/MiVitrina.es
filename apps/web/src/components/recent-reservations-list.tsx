import { CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Reservation } from "@/lib/types";
import { ReservationStatus } from "@mivitrina/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<ReservationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING_VALIDATION: { label: "En attente", variant: "outline" },
  CONFIRMED: { label: "Confirmée", variant: "default" },
  ACTIVE: { label: "En cours", variant: "default" },
  COMPLETED: { label: "Terminée", variant: "secondary" },
  CANCELLED_BY_ANNONCEUR: { label: "Annulée", variant: "destructive" },
  CANCELLED_BY_COMMERCANT: { label: "Refusée", variant: "destructive" },
  NO_SHOW: { label: "Absence", variant: "destructive" },
  DISPUTE: { label: "Litige", variant: "destructive" },
};

interface RecentReservationsListProps {
  title: string;
  reservations: Reservation[];
  viewer: "annonceur" | "commercant";
  seeAllHref: string;
  emptyMessage: string;
  limit?: number;
}

/** Aperçu compact des dernières réservations pour un tableau de bord — pas de duplication de ReservationCard. */
export function RecentReservationsList({
  title,
  reservations,
  viewer,
  seeAllHref,
  emptyMessage,
  limit = 5,
}: RecentReservationsListProps) {
  const items = reservations.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">{title}</CardTitle>
        {reservations.length > 0 && (
          <Button size="sm" variant="ghost" render={<Link href={seeAllHref} />}>
            Voir tout
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((r) => {
              const statusInfo = STATUS_LABELS[r.status];
              const name =
                viewer === "annonceur"
                  ? r.space.commercantProfile?.businessName
                  : r.annonceurProfile?.companyName || r.annonceurProfile?.user.email;
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {new Date(r.startDate).toLocaleDateString("fr-FR")} · {Number(r.transaction.amount).toFixed(0)} €
                    </p>
                  </div>
                  <Badge variant={statusInfo.variant} className="shrink-0">
                    {statusInfo.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
