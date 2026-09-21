import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";
import { AppShell } from "@/components/app-shell";

/**
 * Layout partagé pour tout l'espace authentifié commerçant/annonceur
 * (tableau de bord, vitrine, réservations, messages) : une seule
 * vérification d'authentification, une seule coquille (sidebar +
 * panneau mobile) — chaque page n'a plus qu'à fournir son contenu.
 * Un admin qui atterrit ici est renvoyé vers /admin, qui a sa propre
 * coquille dédiée.
 */
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");

  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  const authedUser = user as AuthUser;

  if (authedUser.role === UserRole.ADMIN) {
    redirect({ href: "/admin", locale });
  }

  // Contador del menú "Soporte" (respuestas sin leer). Un fallo aquí no debe romper el panel: se muestra 0.
  const { data: unread } = await serverApiGet<{ count: number }>("/support/unread-count");

  return (
    <AppShell user={authedUser} supportUnread={unread?.count ?? 0}>
      {children}
    </AppShell>
  );
}
