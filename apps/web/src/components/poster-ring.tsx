"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
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

const RADIUS_PX = 240;
/** Degrés d'anneau parcourus par pixel glissé — accroche réactive sans être nerveuse. */
const DRAG_SENSITIVITY = 0.45;

/**
 * Anneau de pósters qu'on fait tourner en le glissant (souris ou doigt) —
 * inspiré du "ring" de hikoway.com, mais avec du contenu propre à
 * MiVitrina (de vraies affiches d'événements plutôt que des écrans d'app)
 * et sa propre mécanique : pas de librairie de carrousel, juste
 * `useMotionValue` + un peu de trigonométrie CSS (chaque affiche est
 * positionnée par une double rotation qui la garde bien droite tout en la
 * plaçant sur le cercle). Celle qui passe devant grossit et s'éclaircit,
 * les autres reculent visuellement — mêmes hikoway mais réinterprété.
 */
export function PosterRing({ posters, hint }: PosterRingProps) {
  const rotation = useMotionValue(0);
  const dragStartRotation = useRef(0);

  function handleDragStart() {
    dragStartRotation.current = rotation.get();
  }

  function handleDrag(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    rotation.set(dragStartRotation.current + info.offset.x * DRAG_SENSITIVITY);
  }

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    const projected = rotation.get() + info.velocity.x * 0.12;
    animate(rotation, projected, { type: "spring", stiffness: 55, damping: 20, mass: 0.6 });
  }

  const step = 360 / posters.length;

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
        className="relative h-[19rem] w-full max-w-3xl cursor-grab touch-pan-y select-none active:cursor-grabbing sm:h-[22rem]"
      >
        {posters.map((poster, i) => (
          <RingItem key={poster.src} poster={poster} angle={step * i} rotation={rotation} />
        ))}
      </motion.div>

      <span className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <Hand className="size-4 text-primary" />
        {hint}
      </span>
    </div>
  );
}

/** Distance angulaire au point "face à l'écran" (0°), toujours entre 0 et 180. */
function angularDistance(effectiveAngleDeg: number): number {
  const normalized = ((effectiveAngleDeg % 360) + 360) % 360;
  return normalized > 180 ? 360 - normalized : normalized;
}

function RingItem({
  poster,
  angle,
  rotation,
}: {
  poster: RingPoster;
  angle: number;
  rotation: ReturnType<typeof useMotionValue<number>>;
}) {
  const transform = useTransform(rotation, (r) => {
    const total = r + angle;
    // Double rotation : place l'élément sur le cercle (translateX après une
    // première rotation) puis annule la rotation sur l'élément lui-même
    // (deuxième rotation inverse) pour qu'il reste bien droit, jamais penché.
    return `translate(-50%, -50%) rotate(${total}deg) translateX(${RADIUS_PX}px) rotate(${-total}deg)`;
  });
  const opacity = useTransform(rotation, (r) => 1 - Math.min(angularDistance(r + angle) / 165, 1) * 0.75);
  const scale = useTransform(rotation, (r) => 1 - Math.min(angularDistance(r + angle) / 165, 1) * 0.32);
  const zIndex = useTransform(rotation, (r) => Math.round(1000 - angularDistance(r + angle)));

  return (
    <motion.div
      style={{ transform, opacity, scale, zIndex }}
      className="absolute top-1/2 left-1/2 w-32 sm:w-40"
    >
      <div className="spotlight-hover overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="relative aspect-[3/4]">
          <Image
            src={poster.src}
            alt={poster.alt}
            fill
            sizes="160px"
            draggable={false}
            className="pointer-events-none object-cover"
          />
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-medium text-muted-foreground">{poster.label}</p>
    </motion.div>
  );
}
