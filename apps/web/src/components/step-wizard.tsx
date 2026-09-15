"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface StepWizardProps {
  /** Index de l'étape active (0-based). */
  step: number;
  /** Un panneau par étape, dans l'ordre. */
  children: ReactNode[];
  className?: string;
}

/**
 * Conteneur à panneaux glissants (type "assistant en plusieurs étapes") :
 * les panneaux sont posés côte à côte et on translate horizontalement
 * vers celui actif. Pas de librairie d'animation (voir Reveal, même
 * philosophie) — juste `transform`/`height` en CSS, avec ResizeObserver
 * pour que la hauteur du conteneur suive celle du panneau actif (les
 * étapes n'ont pas toutes le même nombre de champs).
 */
export function StepWizard({ step, children, className }: StepWizardProps) {
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number>();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const panel = panelRefs.current[step];
    if (!panel) return;

    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    observer.observe(panel);
    setHeight(panel.offsetHeight);
    return () => observer.disconnect();
  }, [step]);

  return (
    <div
      className={className}
      style={{
        overflow: "hidden",
        height,
        transition: reduceMotion ? undefined : "height 0.3s ease",
      }}
    >
      <div
        className="flex items-start"
        style={{
          transform: `translateX(-${step * 100}%)`,
          transition: reduceMotion ? undefined : "transform 0.3s ease",
        }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            className="w-full shrink-0"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
