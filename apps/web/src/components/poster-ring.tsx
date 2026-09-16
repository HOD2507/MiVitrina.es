"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimationFrame,
  animate,
  type PanInfo,
} from "framer-motion";
import { Hand } from "lucide-react";

export interface RingPoster {
  src: string;
  alt: string;
  label: string;
}

interface PosterRingProps {
  posters: RingPoster[];
  hint: string;
}

/** Distance horizontale (px) entre deux affiches voisines au repos. */
const SPACING_PX = 210;
/** Vitesse de rotation automatique, en "affiches par seconde" — lent et élégant. */
const AUTO_ROTATE_SPEED = 0.11;

/**
 * Ramène un décalage brut (peut être n'importe quel entier/flottant) dans
 * l'intervalle (-n/2, n/2] — c'est ce qui fait boucler l'anneau à l'infini
 * dans les deux sens au lieu de s'arrêter au premier/dernier élément.
 */
function wrappedOffset(raw: number, n: number): number {
  let o = raw % n;
  if (o > n / 2) o -= n;
  if (o < -n / 2) o += n;
  return o;
}

/**
 * Rangée d'affiches en "coverflow" qui tourne toute seule au repos (lent,
 * continu) et qu'on peut aussi faire tourner à la main en la glissant —
 * inspiré du ring de hikoway.com, mais entièrement horizontal (une vraie
 * boucle 360° incluant le haut/bas ne tenait pas dans un bandeau large et
 * bas, voir historique de ce composant) et avec du contenu propre à
 * MiVitrina. La progression du glissement (en "nombre d'affiches
 * parcourues", pas en degrés) pilote la position de chaque affiche sur un
 * axe X ; l'affiche centrale grossit et s'éclaircit, les autres reculent
 * avec une légère bascule 3D (rotateY). Boucle à l'infini même avec peu
 * d'affiches.
 */
export function PosterRing({ posters, hint }: PosterRingProps) {
  const progress = useMotionValue(0);
  const dragStartProgress = useRef(0);
  // Ref plutôt que state : lue à chaque frame par useAnimationFrame, pas
  // besoin de re-render à chaque changement.
  const isInteracting = useRef(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Rotation automatique continue tant que l'utilisateur ne glisse pas la
  // main dessus (et pas de rotation automatique si mouvement réduit
  // demandé — seule l'interaction volontaire au glisser reste possible).
  useAnimationFrame((_, delta) => {
    if (isInteracting.current || reducedMotion.current) return;
    progress.set(progress.get() + (AUTO_ROTATE_SPEED * delta) / 1000);
  });

  function handleDragStart() {
    isInteracting.current = true;
    dragStartProgress.current = progress.get();
  }

  function handleDrag(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    progress.set(dragStartProgress.current - info.offset.x / SPACING_PX);
  }

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    const projected = progress.get() - (info.velocity.x / SPACING_PX) * 0.15;
    // Se cale sur l'affiche la plus proche plutôt que de s'arrêter à un
    // point aléatoire — sensation "carrousel" nette plutôt que flottante.
    // La rotation automatique ne reprend qu'une fois cette animation finie
    // (onComplete), sinon les deux se battraient sur la même valeur.
    animate(progress, Math.round(projected), {
      type: "spring",
      stiffness: 220,
      damping: 28,
      mass: 0.7,
      onComplete: () => {
        isInteracting.current = false;
      },
    });
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ perspective: 1100 }}
        className="relative h-64 w-full max-w-4xl cursor-grab touch-pan-y overflow-hidden select-none active:cursor-grabbing sm:h-80 lg:h-96"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-32"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-32"
        />
        {posters.map((poster, i) => (
          <RingItem key={poster.src} poster={poster} index={i} count={posters.length} progress={progress} />
        ))}
      </motion.div>

      <span className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <Hand className="size-4 text-primary" />
        {hint}
      </span>
    </div>
  );
}

function RingItem({
  poster,
  index,
  count,
  progress,
}: {
  poster: RingPoster;
  index: number;
  count: number;
  progress: ReturnType<typeof useMotionValue<number>>;
}) {
  const transform = useTransform(progress, (p) => {
    const offset = wrappedOffset(index - p, count);
    const dist = Math.min(Math.abs(offset), 2.2);
    const scale = 1 - dist * 0.22;
    const rotateY = offset * -22;
    return `translate(-50%, -50%) translateX(${offset * SPACING_PX}px) scale(${scale}) rotateY(${rotateY}deg)`;
  });
  const opacity = useTransform(progress, (p) => {
    const dist = Math.min(Math.abs(wrappedOffset(index - p, count)), 2.2);
    return Math.max(1 - dist * 0.42, 0.15);
  });
  const zIndex = useTransform(progress, (p) => Math.round(100 - Math.abs(wrappedOffset(index - p, count)) * 10));

  return (
    <motion.div
      style={{ transform, opacity, zIndex, transformStyle: "preserve-3d" }}
      className="absolute top-1/2 left-1/2 w-36 sm:w-48 lg:w-56"
    >
      <div className="spotlight-hover overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="relative aspect-[3/4]">
          <Image
            src={poster.src}
            alt={poster.alt}
            fill
            sizes="(min-width: 1024px) 224px, (min-width: 640px) 192px, 144px"
            draggable={false}
            className="pointer-events-none object-cover"
          />
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">{poster.label}</p>
    </motion.div>
  );
}
