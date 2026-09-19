"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";

/**
 * Lenis anime le scroll lui-même (transform + rAF) plutôt que de laisser le
 * navigateur sauter nativement — un lien d'ancre (#faq, venant du header ou
 * d'un clic sur place) doit donc passer par `lenis.scrollTo`, sinon Lenis
 * ramène la page à sa position avant même que le saut natif soit visible.
 * Gère les deux cas : arrivée sur la page avec un hash déjà dans l'URL
 * (navigation depuis une autre page) et clic sur une ancre pendant qu'on y
 * est déjà (événement `hashchange`).
 */
function HashScrollSync() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    const scrollToHash = () => {
      const { hash } = window.location;
      if (!hash) return;
      const target = document.querySelector(hash);
      if (target) lenis.scrollTo(target as HTMLElement, { offset: -16 });
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [lenis]);

  return null;
}

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
    <>
      <ReactLenis
        root
        options={{
          duration: 1.4,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          smoothWheel: true,
        }}
      />
      <HashScrollSync />
    </>
  );
}
