"use client";

import { useEffect, useRef } from "react";

interface LottiePlayerProps {
  /** Chemin public vers le fichier JSON (ex: /animations/hero-poster-loop.json). */
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  /** Description accessible : le canvas d'animation est purement décoratif sans elle. */
  ariaLabel?: string;
}

/**
 * Lecteur Lottie minimal basé sur lottie-web (rendu SVG).
 * Chargement dynamique côté client uniquement : lottie-web manipule le DOM
 * directement et n'a pas de rendu SSR pertinent pour une animation décorative.
 */
export function LottiePlayer({ src, className, loop = true, autoplay = true, ariaLabel }: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animation: import("lottie-web").AnimationItem | undefined;
    let cancelled = false;

    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !containerRef.current) return;
      animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop,
        autoplay,
        path: src,
      });
    });

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, [src, loop, autoplay]);

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />;
}
