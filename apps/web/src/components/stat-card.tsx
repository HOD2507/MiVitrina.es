import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Texte secondaire optionnel (ex: comparaison réelle à une période précédente) — jamais inventé, seulement si la donnée existe vraiment. */
  hint?: string;
  tone?: "default" | "accent";
}

/**
 * Carte indicateur pour les tableaux de bord — valeur réelle, pas de
 * fioriture inutile. Layout dense (icône + libellé + valeur sur une seule
 * rangée, `size="sm"`) plutôt que header/content séparés : à contenu égal
 * (une icône, un chiffre), la carte occupe bien moins de hauteur pour un
 * même niveau de lisibilité — corrige le "trop d'espace blanc" du tableau
 * de bord signalé par l'utilisateur.
 */
export function StatCard({ icon: Icon, label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <Card size="sm" className="hover-lift">
      <CardContent className="flex items-center gap-3">
        <span
          className={
            tone === "accent"
              ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          }
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="font-heading text-xl leading-tight font-semibold">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
