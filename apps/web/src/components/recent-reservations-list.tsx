import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Inbox } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Reservation } from "@/lib/types";
import type { ReservationStatus } from "@mivitrina/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";

interface RecentReservationsListProps {
  title: string;
  reservations: Reservation[];
  viewer: "annonceur" | "commercant";
  seeAllHref: string;
  seeAllLabel: string;
  emptyMessage: string;
  /** Icône (repli générique) de l'état vide — remplacée par `emptyIllustration` si fournie. */
  emptyIcon?: LucideIcon;
  /** Petite illustration de marque pour l'état vide, plutôt qu'une icône grise générique de bibliothèque. */
  emptyIllustration?: ReactNode;
  emptyCtaHref?: string;
  emptyCtaLabel?: string;
  /** Construit côté appelant (composant serveur) avec `getTranslations` — ce composant n'a pas de traductions à lui. */
  statusLabels: Record<ReservationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;
  /** Tag BCP-47 (ex: "es-ES", "en-GB") pour le formatage de date, calculé côté appelant depuis la locale courante. */
  dateLocale: string;
  limit?: number;
}

/** Aperçu compact des dernières réservations pour un tableau de bord — pas de duplication de ReservationCard. */
export function RecentReservationsList({
  title,
  reservations,
  viewer,
  seeAllHref,
  seeAllLabel,
  emptyMessage,
  emptyIcon: EmptyIcon = Inbox,
  emptyIllustration,
  emptyCtaHref,
  emptyCtaLabel,
  statusLabels,
  dateLocale,
  limit = 5,
}: RecentReservationsListProps) {
  const items = reservations.slice(0, limit);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">{title}</CardTitle>
        {reservations.length > 0 && (
          <Button size="sm" variant="ghost" render={<Link href={seeAllHref} />}>
            {seeAllLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            illustration={emptyIllustration}
            icon={EmptyIcon}
            title={emptyMessage}
            ctaHref={emptyCtaHref}
            ctaLabel={emptyCtaLabel}
            className="py-6"
          />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((r) => {
              const statusInfo = statusLabels[r.status];
              const name =
                viewer === "annonceur"
                  ? r.space.commercantProfile?.businessName
                  : r.annonceurProfile?.companyName || r.annonceurProfile?.user.name || r.annonceurProfile?.user.email;
              return (
                <div
                  key={r.id}
                  className="-mx-(--card-spacing) flex items-center justify-between gap-3 px-(--card-spacing) py-3 transition-colors hover:bg-muted/50"
                >
                  {viewer === "commercant" && (
                    <UserAvatar src={r.annonceurProfile?.user.avatarUrl} name={name ?? ""} size="sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {new Date(r.startDate).toLocaleDateString(dateLocale)} · {Number(r.transaction.amount).toFixed(0)} €
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
