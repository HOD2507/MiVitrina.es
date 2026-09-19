"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

/**
 * Léger tilt 3D au survol, suivant la position du curseur — le genre de
 * micro-interaction qu'on trouve sur les dashboards/landings les plus
 * soignés (Linear, Stripe...). Désactivé si mouvement réduit demandé (le
 * contenu reste alors parfaitement statique, jamais juste "moins animé").
 *
 * Perf (retour utilisateur explicite — site "lent, peu réactif aux
 * clics" après l'ajout du tilt) : `onMouseMove` peut se déclencher des
 * centaines de fois par seconde (souris haute fréquence/trackpad), et
 * `getBoundingClientRect()` force une synchronisation layout à chaque
 * appel — le faire à chaque pixel de mouvement bloquait le thread
 * principal (donc aussi le traitement des clics). Corrigé par : (1) un
 * seul `getBoundingClientRect()` par entrée de survol, mis en cache dans
 * un ref plutôt que relu à chaque `mousemove` ; (2) les mises à jour des
 * motion values limitées à une fois par frame via requestAnimationFrame
 * (throttle), les événements intermédiaires étant ignorés — inutile
 * d'aller plus vite que le taux de rafraîchissement de l'écran.
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const reduceMotion = useReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 300, damping: 22 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-8, 8]), { stiffness: 300, damping: 22 });
  const scale = useSpring(1, { stiffness: 300, damping: 22 });

  function flush() {
    rafRef.current = null;
    const pending = pendingRef.current;
    const rect = rectRef.current;
    if (!pending || !rect) return;
    px.set((pending.x - rect.left) / rect.width);
    py.set((pending.y - rect.top) / rect.height);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    // Coordonnées brutes stockées immédiatement ; seul le calcul (division
    // par le rect mis en cache) et l'écriture des motion values sont
    // reportés à la prochaine frame — jamais plus d'une fois par frame,
    // quel que soit le nombre d'événements mousemove reçus entre-temps.
    pendingRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flush);
    }
  }

  function handleEnter() {
    if (reduceMotion || !ref.current) return;
    // Mesuré une seule fois à l'entrée du survol plutôt qu'à chaque
    // mousemove — le rect ne peut de toute façon pas changer pendant un
    // survol continu (voir commentaire au-dessus).
    rectRef.current = ref.current.getBoundingClientRect();
    scale.set(1.02);
  }

  function handleLeave() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingRef.current = null;
    rectRef.current = null;
    px.set(0.5);
    py.set(0.5);
    scale.set(1);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={
        reduceMotion
          ? undefined
          : { rotateX, rotateY, scale, transformPerspective: 800 }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
