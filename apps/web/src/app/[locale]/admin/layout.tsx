import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";
import { AdminShell } from "@/components/admin-shell";

/** Protège toutes les pages /admin/* : réservé au rôle ADMIN — vérifié ici
 * côté serveur (pas seulement en cachant le lien), et de toute façon
 * imposé une seconde fois par `@Roles(UserRole.ADMIN)` côté API. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");

  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  const authedUser = user as AuthUser;
  if (authedUser.role !== UserRole.ADMIN) {
    redirect({ href: "/dashboard", locale });
  }

  return <AdminShell user={authedUser}>{children}</AdminShell>;
}
