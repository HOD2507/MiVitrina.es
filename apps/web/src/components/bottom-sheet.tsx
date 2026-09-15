"use client";

import { useRef, useState, type ReactNode } from "react";

interface BottomSheetProps {
  /** Toujours visible, même quand la feuille est repliée (ex: titre + compteur de résultats). */
  peek: ReactNode;
  children: ReactNode;
  /** Hauteur repliée en pixels (juste le "peek" + la poignée). */
  collapsedHeight?: number;
}

/**
 * Feuille coulissante ancrée en bas de l'écran (mobile uniquement, voir
 * `lg:hidden` côté appelant) — remplace une liste de résultats "plate"
 * par quelque chose de plus proche des apps de cartographie usuelles
 * (Google Maps, Airbnb) : on glisse la poignée vers le haut pour voir
 * la liste complète, vers le bas pour revenir à la carte.
 */
export function BottomSheet({ peek, children, collapsedHeight = 96 }: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const expandedHeight = typeof window !== "undefined" ? window.innerHeight * 0.75 : 600;

  function handlePointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    setDragOffset(e.clientY - dragStartY.current);
  }

  function handlePointerUp() {
    if (dragStartY.current === null) return;
    // Glissement vers le bas de plus de 40px : replie. Vers le haut : déplie.
    if (dragOffset > 40) setExpanded(false);
    else if (dragOffset < -40) setExpanded(true);
    dragStartY.current = null;
    setDragOffset(0);
  }

  const height = expanded ? expandedHeight : collapsedHeight;
  const translateY = dragStartY.current !== null ? Math.max(0, dragOffset) : 0;

  return (
    <div
      ref={sheetRef}
      // z-[1001] : au-dessus des contrôles/popups Leaflet, qui montent jusqu'à z-index 1000.
      className="fixed inset-x-0 bottom-0 z-[1001] flex flex-col rounded-t-2xl border-t border-border bg-card shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.15)] transition-[height,transform] duration-300 ease-out lg:hidden"
      style={{
        height,
        transform: `translateY(${translateY}px)`,
        transitionProperty: dragStartY.current !== null ? "none" : "height, transform",
      }}
    >
      <button
        type="button"
        aria-label={expanded ? "Réduire la liste" : "Voir la liste des commerces"}
        onClick={() => setExpanded((v) => !v)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex shrink-0 cursor-grab flex-col items-center gap-2 pt-2.5 pb-1 active:cursor-grabbing"
      >
        <span className="h-1.5 w-10 rounded-full bg-border" />
      </button>

      <div className="shrink-0 px-4 pb-2">{peek}</div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">{children}</div>
    </div>
  );
}
