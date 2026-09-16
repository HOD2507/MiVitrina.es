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
];

const TILE_COUNT = 12;
const SESSION_KEY = "mivitrina-intro-seen";

interface Tile {
  src: string;
  leftPct: number;
  topPct: number;
  rotate: number;
  fromX: number;
  fromY: number;
  delay: number;
}

/** Dispose les tuiles en grille lâche (4 colonnes) avec un peu de hasard,
 * chacune arrivant d'un bord différent — évite le clustering au centre
 * qu'un positionnement 100% aléatoire produirait souvent. */
function buildTiles(): Tile[] {
  const edges = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
  return Array.from({ length: TILE_COUNT }, (_, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const edge = edges[i % edges.length];
    const throwDistance = 900;
    return {
      src: POSTERS[i % POSTERS.length],
      leftPct: 8 + col * 24 + (Math.random() * 10 - 5),
      topPct: 12 + row * 32 + (Math.random() * 10 - 5),
      rotate: Math.random() * 26 - 13,
      fromX: edge.x * throwDistance,
      fromY: edge.y * throwDistance,
      delay: i * 0.06,
    };
  });
}

/**
 * Rideau d'ouverture joué une fois par session : une volée d'affiches
 * (vraies photos déjà utilisées ailleurs sur le site) arrive de tous les
 * bords et "se colle" à l'écran façon mur d'affichage, avant que le site
 * n'apparaisse dessous. Idée demandée par l'utilisateur ("millions de
 * posters qui se collent").
 *
 * `visible` démarre à `true` (rendu serveur identique pour tout le monde)
 * pour ne jamais laisser transparaître le contenu réel avant que le check
 * sessionStorage n'ait tranché, côté client, dans un `useLayoutEffect`
 * (avant peinture) plutôt qu'un `useEffect` — sur une visite déjà vue dans
 * la session, ça évite un flash du site nu avant disparition immédiate.
 */
export function IntroPosterSplash() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
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
      // Stockage indisponible (navigation privée stricte, etc.) : on
      // laisse l'animation jouer une fois quand même, tant pis si elle
      // se répète — ne jamais bloquer l'affichage du site pour ça.
    }
    const exitTimer = setTimeout(() => setExiting(true), 1500);
    const hideTimer = setTimeout(() => setVisible(false), 2200);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [reduceMotion]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      onClick={() => setExiting(true)}
      className={`bg-ink fixed inset-0 z-[100] cursor-pointer overflow-hidden transition-[opacity,transform] duration-700 ease-in ${
        exiting ? "pointer-events-none scale-110 opacity-0" : "opacity-100"
      }`}
    >
      {tiles.map((tile, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5, x: tile.fromX, y: tile.fromY, rotate: tile.rotate * 2 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: tile.rotate }}
          transition={{ type: "spring", stiffness: 190, damping: 17, delay: tile.delay }}
          className="absolute w-24 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-white/10 shadow-2xl sm:w-32"
          style={{ left: `${tile.leftPct}%`, top: `${tile.topPct}%` }}
        >
          <div className="relative aspect-[3/4]">
            <Image src={tile.src} alt="" fill sizes="140px" className="object-cover" />
          </div>
        </motion.div>
      ))}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="text-ink-foreground/95 font-heading absolute inset-0 flex items-center justify-center text-3xl font-extrabold tracking-tight sm:text-5xl"
      >
        MiVitrina
      </motion.p>
    </div>
  );
}
