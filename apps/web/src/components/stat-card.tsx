import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Texte secondaire optionnel (ex: comparaison réelle à une période précédente) — jamais inventé, seulement si la donnée existe vraiment. */
  hint?: string;
  tone?: "primary" | "amber" | "plum" | "muted";
}

/** Une couleur distincte par carte plutôt que 4 cartes identiques grises —
 * reprend la palette "spotlight de vitrine" (globals.css) pour donner à la
 * grille de statistiques un vrai petit moment de couleur au lieu d'un mur
 * de gris uniforme. */
const TONE_STYLES: Record<NonNullable<StatCardProps["tone"]>, { badge: string; bar: string }> = {
  primary: { badge: "bg-primary/12 text-primary", bar: "bg-primary" },
  amber: { badge: "bg-glow-amber/25 text-amber-700", bar: "bg-glow-amber" },
  plum: { badge: "bg-glow-plum/12 text-glow-plum", bar: "bg-glow-plum" },
  muted: { badge: "bg-muted text-muted-foreground", bar: "bg-border" },
};

/**
 * Carte indicateur pour les tableaux de bord — valeur réelle, pas de
 * fioriture inutile. Layout dense (icône + libellé + valeur sur une seule
 * rangée, `size="sm"`) plutôt que header/content séparés : à contenu égal
 * (une icône, un chiffre), la carte occupe bien moins de hauteur pour un
 * même niveau de lisibilité. Une fine barre de couleur en haut (`tone`)
 * donne du caractère visuel sans surcharger le contenu.
 */
export function StatCard({ icon: Icon, label, value, hint, tone = "muted" }: StatCardProps) {
  const styles = TONE_STYLES[tone];
  return (
    <Card size="sm" className="hover-lift relative overflow-hidden pt-3.5">
      <span className={cn("absolute inset-x-0 top-0 h-1", styles.bar)} aria-hidden />
      <CardContent className="flex items-center gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", styles.badge)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl leading-tight font-bold">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
