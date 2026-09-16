"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const POSTERS = [
  "/images/poster-concert.jpg",
  "/images/poster-theatre.jpg",
  "/images/poster-mode.jpg",
  "/images/poster-affiches.jpg",
  "/images/poster-market.jpg",
  "/images/poster-stage-lights.jpg",
];

const TILE_COUNT = 14;
const HOLD_MS = 500;
const SESSION_KEY = "mivitrina-intro-seen";

interface Tile {
  src: string;
  leftPct: number;
  topPct: number;
  widthPx: number;
  rotate: number;
  flyX: number;
  flyY: number;
  flyRotate: number;
  delay: number;
}

/** Positions éparpillées avec des trous entre elles (pas un mur plein) —
 * le site doit se voir tout de suite dans les intervalles, pas seulement
 * une fois les affiches parties. Grille lâche 4×4 + un peu de hasard sur
 * chaque tuile pour l'effet "collé à la main", pas un motif trop régulier. */
function buildTiles(): Tile[] {
  return Array.from({ length: TILE_COUNT }, (_, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const angle = Math.random() * Math.PI * 2;
    const throwDistance = 500 + Math.random() * 400;
    return {
      src: POSTERS[i % POSTERS.length],
      leftPct: 6 + col * 24 + (Math.random() * 14 - 7),
      topPct: 8 + row * 24 + (Math.random() * 14 - 7),
      widthPx: 120 + Math.random() * 60,
      rotate: Math.random() * 20 - 10,
      flyX: Math.cos(angle) * throwDistance,
      flyY: Math.sin(angle) * throwDistance,
      flyRotate: Math.random() * 160 - 80,
      delay: Math.random() * 0.35,
    };
  });
}

/**
 * Quelques affiches (vraies photos déjà utilisées ailleurs) posées sur
 * l'écran à l'ouverture — le site est déjà visible en dessous et dans
 * les intervalles entre elles, pas caché par un mur plein — puis chaque
 * affiche se décolle dans sa propre direction pour dégager le reste.
 * Retour explicite de l'utilisateur après une première version qui
 * masquait tout le site derrière un mur opaque : "quiero que veamos un
 * poquito la web" — ici le site n'est jamais totalement caché.
 *
 * `visible` démarre à `true` (identique au rendu serveur) pour ne jamais
 * laisser apparaître le site nu avant que le check sessionStorage
 * n'ait tranché côté client, dans un `useLayoutEffect` (avant peinture).
 */
export function IntroPosterSplash() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [peeling, setPeeling] = useState(false);
  const tiles = useMemo(buildTiles, []);

  useLayoutEffect(() => {
    if (reduceMotion) {
      setVisible(false);
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setVisible(false);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Stockage indisponible (navigation privée stricte, etc.) : tant
      // pis, l'animation rejouera — ne jamais bloquer l'affichage pour ça.
    }
    const peelTimer = setTimeout(() => setPeeling(true), HOLD_MS);
    const hideTimer = setTimeout(() => setVisible(false), HOLD_MS + 1200);
    return () => {
      clearTimeout(peelTimer);
      clearTimeout(hideTimer);
    };
  }, [reduceMotion]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      onClick={() => setPeeling(true)}
      className="pointer-events-none fixed inset-0 z-[100] cursor-pointer overflow-hidden"
    >
      {tiles.map((tile, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={
            peeling
              ? { x: tile.flyX, y: tile.flyY, rotate: tile.flyRotate, opacity: 0, scale: 0.8 }
              : { opacity: 1, scale: 1, x: 0, y: 0, rotate: tile.rotate }
          }
          transition={
            peeling
              ? { duration: 0.8, delay: tile.delay, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.25, delay: i * 0.02 }
          }
          className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-black/10 shadow-xl"
          style={{ left: `${tile.leftPct}%`, top: `${tile.topPct}%`, width: tile.widthPx }}
        >
          <div className="relative aspect-[3/4]">
            <Image src={tile.src} alt="" fill sizes="200px" className="object-cover" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
