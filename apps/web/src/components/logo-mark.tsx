/**
 * Logomark MiVitrina — une vitrine stylisée (montants + enseigne/affiche
 * posée + sol), déjà dessinée pour le favicon (apps/web/src/app/icon.svg)
 * mais jamais réutilisée ailleurs : le header/footer affichaient juste la
 * lettre "M" en texte système. Extrait ici en composant pour que le vrai
 * logo apparaisse partout où la marque est montrée, favicon compris.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path
        d="M9 21V13.5C9 12.6716 9.67157 12 10.5 12H21.5C22.3284 12 23 12.6716 23 13.5V21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="13" y="16" width="6" height="5" rx="1" fill="currentColor" />
      <path d="M7 21H25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
