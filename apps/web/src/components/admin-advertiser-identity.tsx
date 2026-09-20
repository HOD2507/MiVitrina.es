"use client";

import { useLocale } from "next-intl";
import { getAnnonceurDisplayName } from "@mivitrina/shared";
import { cn } from "cn";

interface AdvertiserIdentityProps {
  profile: { displayName?: string | null; companyName?: string | null } | null | undefined;
  email: string;
  /** `stacked` : nom puis email sur deux lignes (cellule de tableau). `inline` : « Nom (email) » (titre, phrase). */
  layout?: "stacked" | "inline";
  className?: string;
}

/**
 * Identité d'un annonceur dans le panel ADMIN : son nom public ET son email,
 * toujours ensemble. L'admin a besoin des deux — le nom public est ce que
 * voient les commerçants, l'email permet d'identifier le compte pour le
 * support et les litiges. Réservé au panel admin : partout ailleurs
 * (commerçants, chat) un annonceur n'est nommé que par son nom public.
 */
export function AdvertiserIdentity({ profile, email, layout = "stacked", className }: AdvertiserIdentityProps) {
  const name = getAnnonceurDisplayName(profile, useLocale());

  if (layout === "inline") {
    return (
      <span className={className}>
        {name} <span className="font-normal text-muted-foreground">({email})</span>
      </span>
    );
  }

  return (
    <span className={cn("flex min-w-0 flex-col", className)}>
      <span className="truncate font-medium text-foreground">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{email}</span>
    </span>
  );
}
