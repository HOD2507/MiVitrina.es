"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ShieldCheck,
  ShieldAlert,
  Scale,
  ShieldUser,
  ScrollText,
  LifeBuoy,
} from "lucide-react";
import { AdminPermission, hasAdminPermission } from "@mivitrina/shared";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { SidebarShell, type NavItem } from "@/components/sidebar-shell";
import { useCount } from "@/lib/use-count";

/**
 * Même mécanique de sidebar que le panel commerçant/annonceur (voir AppShell/SidebarShell) — un seul système, pas deux styles différents.
 * La visibilité de chaque entrée reflète le périmètre du compte connecté
 * (voir @mivitrina/shared ADMIN_PERMISSIONS) — un affinage visuel seulement :
 * l'accès réel reste imposé côté backend par AdminPermissionGuard, même si
 * un lien caché ici était atteint directement par URL.
 */
export function AdminShell({
  user,
  supportAwaiting,
  children,
}: {
  user: AuthUser;
  /** Tickets de soporte vivos que esperan respuesta del equipo (0 si este admin no tiene acceso a soporte). */
  supportAwaiting: number;
  children: ReactNode;
}) {
  const t = useTranslations("Admin.nav");
  const level = user.adminLevel ?? null;
  const canSupport = hasAdminPermission(level, AdminPermission.SUPPORT_MANAGE);
  // Solo se consulta si el admin puede abrir la bandeja (la API respondería 403 al resto).
  const awaiting = useCount(canSupport ? "/admin/support/awaiting-count" : null, supportAwaiting);

  const nav: NavItem[] = [
    { href: "/admin", label: t("overview"), icon: LayoutDashboard },
    ...(hasAdminPermission(level, AdminPermission.USERS_VIEW)
      ? [{ href: "/admin/users", label: t("users"), icon: Users }]
      : []),
    ...(hasAdminPermission(level, AdminPermission.FINANCE_VIEW)
      ? [{ href: "/admin/reservations", label: t("reservations"), icon: CalendarCheck }]
      : []),
    ...(hasAdminPermission(level, AdminPermission.USERS_VERIFY)
      ? [{ href: "/admin/verifications", label: t("verifications"), icon: ShieldCheck }]
      : []),
    ...(hasAdminPermission(level, AdminPermission.FINANCE_VIEW)
      ? [{ href: "/admin/disputes", label: t("disputes"), icon: ShieldAlert }]
      : []),
    ...(canSupport
      ? [
          {
            href: "/admin/support",
            label: t("support"),
            icon: LifeBuoy,
            badge: awaiting,
            badgeAria: t("supportAwaitingAria", { count: awaiting }),
          },
        ]
      : []),
    ...(hasAdminPermission(level, AdminPermission.SETTINGS_MANAGE)
      ? [{ href: "/admin/settings", label: t("platformRules"), icon: Scale }]
      : []),
    ...(hasAdminPermission(level, AdminPermission.ADMINS_MANAGE)
      ? [{ href: "/admin/admins", label: t("admins"), icon: ShieldUser }]
      : []),
    // Réservé ADMINS_MANAGE (donc SUPERADMIN) : le journal sert notamment
    // à surveiller les actions des rôles SUPPORT/FINANCE, qui ne doivent
    // donc pas pouvoir le consulter eux-mêmes (demande explicite).
    ...(hasAdminPermission(level, AdminPermission.ADMINS_MANAGE)
      ? [{ href: "/admin/audit-log", label: t("auditLog"), icon: ScrollText }]
      : []),
  ];

  const footer = (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="truncate text-sm font-medium">{user.name || user.email}</p>
      <Badge variant="warning" className="mt-1">
        {level ? t(`level.${level}`) : t("adminBadge")}
      </Badge>
      <LogoutButton variant="ghost" className="mt-2 w-full justify-start px-0 text-muted-foreground" />
    </div>
  );

  return (
    <SidebarShell nav={nav} footer={footer}>
      {children}
    </SidebarShell>
  );
}
