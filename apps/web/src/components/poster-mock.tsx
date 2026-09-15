import { cn } from "cn";

interface PosterMockProps {
  /** Ton de couleur — inspiré de vraies vitrines (kraft, corail, encre, olive). */
  tone: "kraft" | "corail" | "encre" | "olive";
  eyebrow: string;
  title: string;
  subtitle?: string;
  rotate?: number;
  className?: string;
}

const TONES: Record<PosterMockProps["tone"], string> = {
  kraft: "bg-[oklch(0.94_0.03_85)] text-[oklch(0.25_0.02_70)]",
  corail: "bg-[oklch(0.72_0.16_35)] text-[oklch(0.99_0.01_85)]",
  encre: "bg-ink text-ink-foreground",
  olive: "bg-[oklch(0.5_0.05_140)] text-[oklch(0.98_0.02_100)]",
};

/**
 * Mock d'affiche façon "vraie vitrine" — scotch aux coins, légère rotation,
 * typographie contrastée (script + bloc). Inspiré de vitrines réelles
 * (restaurants, concept stores) que l'utilisateur a partagées en
 * référence : rien ne reproduit une marque existante, juste l'esprit
 * (papier scotché, couleurs franches, mélange de styles de lettrage).
 */
export function PosterMock({ tone, eyebrow, title, subtitle, rotate = 0, className }: PosterMockProps) {
  return (
    <div
      className={cn("relative w-44 shrink-0 sm:w-52", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* Scotch */}
      <span className="absolute -top-2.5 left-4 h-5 w-12 -rotate-6 bg-[oklch(0.9_0.02_85_/_0.7)] shadow-sm" />
      <span className="absolute -top-2 right-4 h-5 w-12 rotate-3 bg-[oklch(0.9_0.02_85_/_0.7)] shadow-sm" />

      <div
        className={cn(
          "flex aspect-[3/4] flex-col justify-between rounded-sm p-5 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)]",
          TONES[tone],
        )}
      >
        <p className="font-heading text-lg italic opacity-80">{eyebrow}</p>
        <div>
          <p className="font-heading text-3xl leading-[1.05] font-medium text-balance">{title}</p>
          {subtitle && <p className="mt-2 text-sm opacity-80">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
