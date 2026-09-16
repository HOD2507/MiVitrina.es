"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";

/**
 * Défilement fluide avec inertie sur toute la page — remplace le
 * défilement "brut" du navigateur par une interpolation douce à la
 * molette/au doigt (Lenis, librairie légitime et très utilisée — sans
 * rapport avec les paquets douteux refusés plus haut dans cette
 * conversation). Demande explicite de l'utilisateur : "au déroulement,
 * plus lent, plus fluide". Désactivé si prefers-reduced-motion (le
 * scroll avec inertie peut gêner les utilisateurs sensibles au mouvement).
 */
export function SmoothScroll() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <ReactLenis
      root
      options={{
        duration: 1.4,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        smoothWheel: true,
      }}
    />
  );
}
