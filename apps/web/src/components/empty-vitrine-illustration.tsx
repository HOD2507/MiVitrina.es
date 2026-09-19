/**
 * Petite illustration pour l'état vide "aucune réservation pour le
 * moment" — un cadre de vitrine avec deux emplacements d'affiche encore
 * vides (pointillés) et le point d'accent de la marque (voir LogoMark),
 * plutôt que la simple icône grise générique de bibliothèque.
 */
export function EmptyVitrineIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" fill="none" className={className} aria-hidden>
      <rect x="10" y="10" width="100" height="80" rx="14" className="stroke-muted-foreground/25" strokeWidth="2.5" />
      <rect
        x="24"
        y="24"
        width="30"
        height="40"
        rx="5"
        transform="rotate(-6 39 44)"
        className="stroke-muted-foreground/35"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <rect
        x="62"
        y="30"
        width="26"
        height="34"
        rx="5"
        transform="rotate(5 75 47)"
        className="stroke-muted-foreground/35"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <circle cx="92" cy="24" r="5" className="fill-primary" />
    </svg>
  );
}
