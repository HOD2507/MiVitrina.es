"use client";

import { useState } from "react";
import { cn } from "cn";

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-20 text-2xl",
} as const;

/** Iniciales (máx. 2) a partir del nombre/empresa/email — para cuando no hay foto. */
function getInitials(label: string): string {
  const source = label.includes("@") ? label.split("@")[0] : label;
  const words = source.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

interface UserAvatarProps {
  /** URL de lecture signée (ou null : on affiche les initiales). */
  src?: string | null;
  /** Nom d'affichage — sert d'alt et de source des initiales. */
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Photo de profil ronde avec repli sur les initiales. Si l'URL signée
 * a expiré ou que l'image ne charge pas, on retombe aussi sur les
 * initiales plutôt que d'afficher une image cassée.
 */
export function UserAvatar({ src, name, size = "md", className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-heading font-semibold text-accent-foreground ring-1 ring-foreground/10",
        SIZES[size],
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={name} className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{getInitials(name)}</span>
      )}
    </span>
  );
}
