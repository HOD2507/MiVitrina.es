import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AdminPermission, hasAdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";

/**
 * Lance le fetch `/auth/me` sans l'attendre — à appeler en tout début de
 * page, avant tout autre `await`, pour que ce fetch parte EN MÊME TEMPS
 * que celui des données de la page plutôt qu'après (voir
 * `requireAdminPermission` ci-dessous). Mesuré en production : sans ça,
 * les deux requêtes s'enchaînaient en cascade (~13ms perdus sur chaque
 * page admin protégée, pour rien — la requête de données ne dépend pas
 * du résultat de celle-ci).
 */
export function getAdminUser(): Promise<AuthUser | null> {
  return serverApiGet<AuthUser>("/auth/me").then(({ data }) => data);
}

/**
 * À appeler en tête de chaque page /admin/* restreinte à une permission
 * précise (voir AdminPermissionGuard côté API, qui reste la vraie barrière —
 * ceci évite seulement qu'un admin SUPPORT/FINANCE atteignant l'URL
 * directement voie un écran cassé/vide plutôt qu'une redirection propre).
 *
 * Prend le *promise* de `getAdminUser()` plutôt que de faire le fetch
 * elle-même : l'appelant doit lancer `getAdminUser()` ET le fetch des
 * données de la page AVANT le premier `await`, pour que les deux partent
 * en parallèle — voir le commentaire de `getAdminUser`.
 */
export async function requireAdminPermission(
  userPromise: Promise<AuthUser | null>,
  permission: AdminPermission,
): Promise<AuthUser> {
  const [locale, user] = await Promise.all([getLocale(), userPromise]);

  if (!user || !hasAdminPermission(user.adminLevel, permission)) {
    redirect({ href: "/admin", locale });
  }

  return user as AuthUser;
}
