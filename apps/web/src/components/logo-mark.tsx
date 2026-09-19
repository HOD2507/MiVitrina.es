/**
 * Logomark MiVitrina — monograma plano y minimalista (flat design, sin 3D,
 * bisel, sombra ni textura): un único marco cuadrado de esquinas
 * redondeadas (la vitrina) y, dentro, una sola forma geométrica de trazo
 * uniforme que es a la vez una "M" y, en su valle central, una "V" —
 * MiVitrina — compartiendo el mismo trazo, sin relleno sólido ni efecto de
 * insignia. Dos elementos visuales en total, como en Notion/Linear/Stripe.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* Marco de la vitrina: un único cuadro, sin capas anidadas */}
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
      {/* M y V fusionadas: las dos diagonales centrales forman la V */}
      <path
        d="M7 16V8L12 13L17 8V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
