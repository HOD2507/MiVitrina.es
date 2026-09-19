import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import { TiltCard } from "@/components/tilt-card";

interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "primary" | "amber" | "plum" | "muted";
}

/** Dégradé propre à chaque teinte plutôt qu'un aplat — donne aux chiffres
 * la présence visuelle demandée ("l'élément le plus fort de la page"),
 * sans jamais sortir de la palette de marque (primary/ambre/prune). */
const TONE_STYLES: Record<
  NonNullable<StatItem["tone"]>,
  { bg: string; badge: string }
> = {
  primary: {
    bg: "bg-gradient-to-br from-primary/12 via-primary/5 to-transparent",
    badge: "bg-primary text-primary-foreground",
  },
  amber: {
    bg: "bg-gradient-to-br from-glow-amber/35 via-glow-amber/10 to-transparent",
    badge: "bg-glow-amber text-amber-950",
  },
  plum: {
    bg: "bg-gradient-to-br from-glow-plum/20 via-glow-plum/5 to-transparent",
    badge: "bg-glow-plum text-white",
  },
  muted: {
    bg: "bg-gradient-to-br from-foreground/8 via-foreground/3 to-transparent",
    badge: "bg-foreground/85 text-background",
  },
};

/**
 * Résumé chiffré du tableau de bord — quatre cartes individuelles à fond
 * dégradé, ombre et léger tilt 3D au survol : censées être l'élément
 * visuel le plus fort de la page (retour utilisateur explicite), pas un
 * simple alignement de texte. Remplace l'ancienne version "une seule
 * barre divisée" — moins de boîtes ne doit pas dire moins de présence là
 * où les chiffres sont justement ce qui compte le plus.
 */
export function StatsSummary({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value, tone = "muted" }) => {
        const styles = TONE_STYLES[tone];
        return (
          <TiltCard key={label} className="[transform-style:preserve-3d]">
            <div
              className={cn(
                // filter:drop-shadow plutôt que box-shadow pour l'effet au
                // survol : évite un repaint à chaque frame de la
                // transition (transform/filter sont accélérés par le
                // compositeur) — voir Card (composants/ui/card.tsx) pour
                // le même choix et son contexte.
                "rounded-2xl border border-border/60 p-5 shadow-sm transition-[filter] duration-300 hover:[filter:drop-shadow(0_10px_14px_color-mix(in_oklch,var(--foreground),transparent_92%))]",
                styles.bg,
              )}
            >
              <span className={cn("flex size-11 items-center justify-center rounded-xl shadow-sm", styles.badge)}>
                <Icon className="size-5" />
              </span>
              <p className="mt-4 truncate text-sm font-medium text-muted-foreground">{label}</p>
              <p className="font-heading text-3xl leading-tight font-extrabold tracking-tight">{value}</p>
            </div>
          </TiltCard>
        );
      })}
    </div>
  );
}
