"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

// Photos propres au rideau d'ouverture, différentes de celles de l'anneau
// de la galerie plus bas sur la page (demande explicite : "no quiero que
// sean lo mismo que los que estan en la parte del arrastro"). Thème : les
// coulisses de l'impression (presse, papier, sérigraphie, encres) plutôt
// que des affiches finies — cohérent avec les imprentas, un des types de
// commerces de la marketplace, et sans aucun texte/marque réels.
const POSTERS = [
  "/images/intro-print-press.jpg",
  "/images/intro-paper-stock.jpg",
  "/images/intro-screenprint.jpg",
  "/images/intro-paint-buckets.jpg",
  "/images/intro-chalk-pastels.jpg",
  "/images/intro-thread-cones.jpg",
  "/images/intro-thread-spools.jpg",
  "/images/intro-color-pencils.jpg",
  "/images/intro-ink-swirls.jpg",
  "/images/intro-gradient-stripes.jpg",
];

/** Beaucoup d'affiches ("millones de posters", demande de l'utilisateur)
 * amoncelées au centre — pas un mur qui couvre tout l'écran, un vrai tas. */
const TILE_COUNT = 46;
const HOLD_MS = 450;
/** Un petit groupe "meneur" se décolle lentement en premier, avant que
 * le reste du tas ne parte d'un coup, vite — demande explicite : "primero
 * que se despeguen lentamente y después rápidamente". */
const LEADER_COUNT = 5;

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
  duration: number;
  z: number;
}

/** Tas d'affiches concentré au centre de l'écran (~± 30% autour du milieu)
 * — les bords/coins restent dégagés dès le départ pour qu'on voie déjà le
 * site autour. Tailles et rotations très variées pour un vrai effet de
 * pile chaotique, pas une grille propre. */
function buildTiles(): Tile[] {
  return Array.from({ length: TILE_COUNT }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const throwDistance = 500 + Math.random() * 500;
    const isLeader = i < LEADER_COUNT;
    return {
      src: POSTERS[i % POSTERS.length],
      leftPct: 50 + (Math.random() * 64 - 32),
      topPct: 50 + (Math.random() * 56 - 28),
      widthPx: 90 + Math.random() * 90,
      rotate: Math.random() * 50 - 25,
      flyX: Math.cos(angle) * throwDistance,
      flyY: Math.sin(angle) * throwDistance,
      flyRotate: Math.random() * 200 - 100,
      // Meneurs : partent tout de suite, lentement (1.1s). Le gros du tas
      // attend qu'ils soient bien engagés puis part très vite (0.35s),
      // avec très peu d'écart entre eux — l'effet "lent puis rapide".
      delay: isLeader ? Math.random() * 0.15 : 0.55 + Math.random() * 0.1,
      duration: isLeader ? 1.1 : 0.35,
      z: Math.round(Math.random() * 40),
    };
  });
}

/**
 * Tas d'affiches (vraies photos déjà utilisées ailleurs) amoncelées au
 * centre de l'écran à l'ouverture — le site reste visible sur les bords —
 * puis elles se décollent quasi toutes ensemble pour dégager le reste.
 *
 * Rejoue à chaque chargement/rafraîchissement de la page (pas de garde
 * sessionStorage) — demande explicite de l'utilisateur après avoir
 * remarqué qu'un rafraîchissement ne relançait pas l'animation.
 */
export function IntroPosterSplash() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [peeling, setPeeling] = useState(false);
  const tiles = useMemo(buildTiles, []);

  useEffect(() => {
    if (reduceMotion) {
      setVisible(false);
      return;
    }
    const peelTimer = setTimeout(() => setPeeling(true), HOLD_MS);
    // Les meneurs partent lentement (jusqu'à 1.25s après le début du
    // décollage) — on attend qu'ils aient fini avant de démonter le voile.
    const hideTimer = setTimeout(() => setVisible(false), HOLD_MS + 1400);
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
              ? { duration: tile.duration, delay: tile.delay, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.2, delay: i * 0.006 }
          }
          className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-black/10 shadow-xl"
          style={{ left: `${tile.leftPct}%`, top: `${tile.topPct}%`, width: tile.widthPx, zIndex: tile.z }}
        >
          <div className="relative aspect-[3/4]">
            <Image src={tile.src} alt="" fill sizes="200px" className="object-cover" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
