import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Petite illustration de marque (voir EmptyVitrineIllustration) — prioritaire sur `icon` si fournie. */
  illustration?: ReactNode;
  icon?: LucideIcon;
  title: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
}

/**
 * État vide générique du panel — une icône grise de 24px perdue au milieu
 * d'une carte blanche ne dit rien de la marque (retour utilisateur
 * explicite, notamment sur Messages, qui n'en avait même pas). Un seul
 * composant plutôt qu'un bloc réinventé à chaque écran : le style change
 * une fois, partout à la fois.
 */
export function EmptyState({ illustration, icon: Icon, title, description, ctaHref, ctaLabel, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-3 py-10 text-center ${className ?? ""}`}>
      {illustration ??
        (Icon && (
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-glow-amber/20 text-primary">
            <Icon className="size-6" />
          </span>
        ))}
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {ctaHref && ctaLabel && (
        <Button
          size="sm"
          className="mt-1 transition-transform duration-150 hover:scale-[1.03] active:scale-95"
          render={<Link href={ctaHref} />}
        >
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
