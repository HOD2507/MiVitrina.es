import "server-only";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { withTimeout } from "@/lib/with-timeout";
import type { AuthUser } from "@/lib/types";

/**
 * Destination du lien "← Mi panel" des pages publiques (recherche, fiche
 * commerce) : `/dashboard` si le visiteur est connecté en tant
 * qu'ANNONCEUR, `null` sinon (visiteur anonyme, commerçant, admin).
 * Fail-open : si l'API ne répond pas vite, on affiche l'en-tête public
 * habituel plutôt que de bloquer la page.
 */
export async function getAnnonceurPanelHref(): Promise<string | null> {
  try {
    const { data: user } = await withTimeout(serverApiGet<AuthUser>("/auth/me"), 2500);
    return user?.role === UserRole.ANNONCEUR ? "/dashboard" : null;
  } catch {
    return null;
  }
}
