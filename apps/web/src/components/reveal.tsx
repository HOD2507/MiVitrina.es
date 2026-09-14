"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Délai en ms avant l'animation, pour échelonner plusieurs éléments (effet cascade). */
  delay?: number;
}

/**
 * Fait apparaître son contenu (fondu + léger glissement vers le haut) au
 * moment où il entre dans le viewport. Volontairement pas de librairie
 * d'animation (framer-motion, etc.) pour un effet aussi discret — un
 * simple IntersectionObserver + transition CSS suffit et évite une
 * dépendance de plus.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respecte les préférences d'accessibilité : pas d'animation si demandé.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.6s ease, transform 0.6s ease`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
