"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LayoutDashboard, Store, CalendarCheck, MessageCircle, Search, Settings, LifeBuoy } from "lucide-react";
import { getAnnonceurDisplayName, UserRole } from "@mivitrina/shared";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { SidebarShell, type NavItem } from "@/components/sidebar-shell";
import { useCount } from "@/lib/use-count";

/**
 * Coquille d'application pour les espaces authentifiés commerçant/
 * annonceur — calcule juste le menu et le bloc "compte" propres à ce
 * rôle, la mécanique de sidebar elle-même vit dans SidebarShell (partagée
 * avec AdminShell).
 */
export function AppShell({
  user,
  supportUnread,
  children,
}: {
  user: AuthUser;
  /** Respuestas de soporte sin leer, calculado en el servidor (el hook lo mantiene al día). */
  supportUnread: number;
  children: ReactNode;
}) {
  const t = useTranslations("AppShell");
  const locale = useLocale();
  const unread = useCount("/support/unread-count", supportUnread);
  const supportItem: NavItem = {
    href: "/soporte",
    label: t("support"),
    icon: LifeBuoy,
    badge: unread,
    badgeAria: t("supportUnreadAria", { count: unread }),
  };

  const COMMERCANT_NAV: NavItem[] = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/vitrine", label: t("myVitrine"), icon: Store },
    { href: "/dashboard/reservations", label: t("reservations"), icon: CalendarCheck },
    { href: "/messages", label: t("messages"), icon: MessageCircle },
    supportItem,
    { href: "/ajustes", label: t("settings"), icon: Settings },
  ];

  const ANNONCEUR_NAV: NavItem[] = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/recherche", label: t("searchShops"), icon: Search },
    { href: "/mes-reservations", label: t("myReservations"), icon: CalendarCheck },
    { href: "/messages", label: t("messages"), icon: MessageCircle },
    supportItem,
    { href: "/ajustes", label: t("settings"), icon: Settings },
  ];

  const ROLE_LABELS: Record<string, string> = {
    [UserRole.COMMERCANT]: t("roleCommercant"),
    [UserRole.ANNONCEUR]: t("roleAnnonceur"),
  };

  const nav = user.role === UserRole.COMMERCANT ? COMMERCANT_NAV : ANNONCEUR_NAV;
  const displayName =
    user.role === UserRole.ANNONCEUR
      ? getAnnonceurDisplayName(user.annonceurProfile, locale)
      : user.commercantProfile?.businessName || user.email;

  const footer = (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="truncate text-sm font-medium">{displayName}</p>
      <Badge variant="secondary" className="mt-1">
        {ROLE_LABELS[user.role]}
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
