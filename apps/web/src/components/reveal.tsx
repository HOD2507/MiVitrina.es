"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Délai en ms avant l'animation (comme l'ancienne version CSS — tous les appels existants passent déjà des ms), pour échelonner plusieurs éléments (effet cascade). Converti en secondes en interne pour framer-motion. */
  delay?: number;
}

/**
 * Fait apparaître son contenu au moment où il entre dans le viewport — un
 * léger effet ressort (fondu + remontée + micro-zoom) plutôt qu'un simple
 * fondu linéaire, pour un rendu plus "premium". Migré vers framer-motion
 * (déjà une dépendance réelle depuis PosterRing) au lieu de l'ancien
 * IntersectionObserver fait main : `useReducedMotion` natif, et l'anneau
 * de posters partage maintenant la même philosophie d'animation que le
 * reste de la page.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", stiffness: 100, damping: 18, mass: 0.6, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}
