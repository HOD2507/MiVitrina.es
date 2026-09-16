"use client";

import { useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, useMotionTemplate } from "framer-motion";

interface PointerGlowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Halo lumineux qui suit littéralement le curseur — idée propre à
 * MiVitrina (pas reprise de hikoway) qui prolonge la métaphore "spotlight
 * de vitrine" déjà présente ailleurs (globals.css, spotlight-hover) : ici
 * c'est le visiteur lui-même qui tient la lampe. Coordonnées suivies via
 * des motion values (pas de useState par mouvement) pour rester fluide à
 * 60fps sans re-render React à chaque pixel.
 */
export function PointerGlow({ children, className }: PointerGlowProps) {
  const [active, setActive] = useState(false);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const spotlightX = useTransform(mouseX, (v) => `${v * 100}%`);
  const spotlightY = useTransform(mouseY, (v) => `${v * 100}%`);
  const background = useMotionTemplate`radial-gradient(38rem circle at ${spotlightX} ${spotlightY}, color-mix(in oklch, var(--glow-amber), transparent 62%), transparent 72%)`;

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  return (
    <section
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 motion-reduce:hidden"
        style={{ background, opacity: active ? 1 : 0 }}
      />
      {children}
    </section>
  );
}
