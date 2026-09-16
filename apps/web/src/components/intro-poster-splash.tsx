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

/** Colonnes supposées pour calculer la direction "explosion depuis le
 * centre" — approximatif sur mobile (vraie grille en 4 colonnes via CSS)
 * mais l'effet reste convaincant, le mouvement étant chaotique de toute
 * façon. */
const LAYOUT_COLS = 8;
const LAYOUT_ROWS = 6;
const HOLD_MS = 550;
const SESSION_KEY = "mivitrina-intro-seen";

interface WallTile {
  src: string;
  restRotate: number;
  flyX: number;
  flyY: number;
  flyRotate: number;
  delay: number;
}

/** Construit le mur : chaque tuile part du centre logique de la grille et
 * s'envole dans la direction opposée au décollage, un peu de hasard en
 * plus pour ne pas avoir un motif trop parfaitement symétrique. */
function buildWallTiles(): WallTile[] {
  const centerCol = (LAYOUT_COLS - 1) / 2;
  const centerRow = (LAYOUT_ROWS - 1) / 2;
  const tiles: WallTile[] = [];
  let i = 0;
  for (let row = 0; row < LAYOUT_ROWS; row++) {
    for (let col = 0; col < LAYOUT_COLS; col++) {
      const dx = (col - centerCol) / centerCol;
      const dy = (row - centerRow) / centerRow;
      const dist = Math.hypot(dx, dy);
      tiles.push({
        src: POSTERS[i % POSTERS.length],
        restRotate: Math.random() * 6 - 3,
        flyX: dx * 900 + (Math.random() * 240 - 120),
        flyY: dy * 900 + (Math.random() * 240 - 120),
        flyRotate: Math.random() * 140 - 70,
        // Les tuiles proches du centre partent un chouïa avant celles des
        // bords — la déchirure semble commencer au milieu et se propager.
        delay: dist * 0.16 + Math.random() * 0.12,
      });
      i++;
    }
  }
  return tiles;
}

/**
 * Rideau d'ouverture joué une fois par session : au lieu d'affiches qui
 * arrivent pour couvrir l'écran, l'écran est *déjà* couvert par un mur
 * d'affichage (comme un vrai mur de rue) dès le premier rendu — puis
 * chaque affiche se décolle et s'envole dans sa propre direction pour
 * révéler le site en dessous. Version inversée d'un premier essai que
 * l'utilisateur n'a pas aimé (affiches qui arrivaient plutôt que de se
 * détacher).
 *
 * `visible` démarre à `true` (identique au rendu serveur) pour ne jamais
 * laisser transparaître le site avant que le check sessionStorage
 * n'ait tranché côté client, dans un `useLayoutEffect` (avant peinture).
 */
export function IntroPosterSplash() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [peeling, setPeeling] = useState(false);
  const tiles = useMemo(buildWallTiles, []);

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
    const hideTimer = setTimeout(() => setVisible(false), HOLD_MS + 1500);
    return () => {
      clearTimeout(peelTimer);
      clearTimeout(hideTimer);
    };
  }, [reduceMotion]);

  if (!visible) return null;

  function skip() {
    setPeeling(true);
    setTimeout(() => setVisible(false), 500);
  }

  return (
    <motion.div
      aria-hidden
      onClick={skip}
      initial={{ opacity: 1 }}
      animate={{ opacity: peeling ? 0 : 1 }}
      transition={{ duration: 1.1, delay: peeling ? 0.4 : 0 }}
      className="bg-ink fixed inset-0 z-[100] cursor-pointer overflow-hidden"
    >
      <div
        className="grid size-full grid-cols-4 sm:grid-cols-6 lg:grid-cols-8"
        style={{ gridAutoRows: "1fr" }}
      >
        {tiles.map((tile, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={
              peeling
                ? { x: tile.flyX, y: tile.flyY, rotate: tile.flyRotate, opacity: 0, scale: 0.7 }
                : { x: 0, y: 0, rotate: tile.restRotate, opacity: 1, scale: 1.08 }
            }
            transition={{ duration: 0.85, delay: peeling ? tile.delay : 0, ease: [0.22, 1, 0.36, 1] }}
            className="relative border border-white/5"
          >
            <Image src={tile.src} alt="" fill sizes="200px" className="object-cover" />
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: peeling ? 0 : 1 }}
        transition={{ duration: 0.3, delay: peeling ? 0 : 0.4 }}
        className="text-ink-foreground/95 font-heading pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl"
      >
        MiVitrina
      </motion.p>
    </motion.div>
  );
}
