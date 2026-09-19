"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, useMotionTemplate } from "framer-motion";

interface PointerGlowProps {
  children: ReactNode;
  className?: string;
  /** Balise du conteneur (section par défaut) — "div" pour l'utiliser dans un bloc qui n'est pas une section de page (ex: le pavé CTA final). */
  as?: "section" | "div";
  /** Couleur du halo — `amber` (fond clair, défaut) ou `plum` (plus visible sur fond sombre, ex: le bloc CTA "ink"). */
  tone?: "amber" | "plum";
}

/**
 * Halo lumineux qui suit littéralement le curseur — idée propre à
 * MiVitrina (pas reprise de hikoway) qui prolonge la métaphore "spotlight
 * de vitrine" déjà présente ailleurs (globals.css, spotlight-hover) : ici
 * c'est le visiteur lui-même qui tient la lampe. Coordonnées suivies via
 * des motion values (pas de useState par mouvement) pour rester fluide à
 * 60fps sans re-render React à chaque pixel.
 *
 * Perf (retour utilisateur explicite — site lent/peu réactif aux clics
 * après l'ajout de ces effets) : cette section peut couvrir tout le
 * hero — `getBoundingClientRect()` à chaque `mousemove` y forçait une
 * synchronisation layout des centaines de fois par seconde, bloquant le
 * thread principal (donc les clics aussi). Même remède que TiltCard : le
 * rect est mesuré une seule fois par entrée de survol (mis en cache),
 * et les motion values ne sont mises à jour qu'une fois par frame
 * (requestAnimationFrame), jamais à chaque événement brut.
 */
export function PointerGlow({ children, className, as: Tag = "section", tone = "amber" }: PointerGlowProps) {
  const [active, setActive] = useState(false);
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const spotlightX = useTransform(mouseX, (v) => `${v * 100}%`);
  const spotlightY = useTransform(mouseY, (v) => `${v * 100}%`);
  const glowColor = tone === "plum" ? "var(--glow-plum)" : "var(--glow-amber)";
  const glowStrength = tone === "plum" ? 45 : 62;
  const background = useMotionTemplate`radial-gradient(38rem circle at ${spotlightX} ${spotlightY}, color-mix(in oklch, ${glowColor}, transparent ${glowStrength}%), transparent 72%)`;

  function flush() {
    rafRef.current = null;
    const pending = pendingRef.current;
    const rect = rectRef.current;
    if (!pending || !rect) return;
    mouseX.set((pending.x - rect.left) / rect.width);
    mouseY.set((pending.y - rect.top) / rect.height);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    pendingRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flush);
    }
  }

  function handleEnter(e: React.MouseEvent<HTMLElement>) {
    rectRef.current = e.currentTarget.getBoundingClientRect();
    setActive(true);
  }

  function handleLeave() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingRef.current = null;
    rectRef.current = null;
    setActive(false);
  }

  return (
    <Tag className={className} onMouseMove={handleMouseMove} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 motion-reduce:hidden"
        style={{ background, opacity: active ? 1 : 0 }}
      />
      {children}
    </Tag>
  );
}
