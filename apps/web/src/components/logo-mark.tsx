/**
 * Logomark MiVitrina — un monogramme "M" géométrique dessiné au trait
 * (pas une lettre de police système), avec un point plein au sommet
 * central : la même signature "point qui accroche l'œil" déjà utilisée
 * partout ailleurs sur le site (badges eyebrow, PointerGlow, spotlight-
 * hover) — comme si le M lui-même portait le spotlight de la marque.
 * Remplace une première version (icône de vitrine) que l'utilisateur
 * n'a pas trouvée convaincante.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 18V7L12 14L20 7V18"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="1.7" fill="currentColor" />
    </svg>
  );
}
