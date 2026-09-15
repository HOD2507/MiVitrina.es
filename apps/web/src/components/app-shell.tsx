"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Store,
  CalendarCheck,
  MessageCircle,
  Search,
  Menu,
  X,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import type { AuthUser } from "@/lib/types";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

/**
 * Coquille d'application pour les espaces authentifiés (commerçant/
 * annonceur) : navigation latérale persistante sur desktop, panneau
 * coulissant sur mobile. Remplace l'ancien pattern "AppHeader +
 * <main>" répété sur chaque page — une seule fois dans (app)/layout.tsx.
 */
export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const t = useTranslations("AppShell");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const COMMERCANT_NAV: NavItem[] = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/vitrine", label: t("myVitrine"), icon: Store },
    { href: "/dashboard/reservations", label: t("reservations"), icon: CalendarCheck },
    { href: "/messages", label: t("messages"), icon: MessageCircle },
  ];

  const ANNONCEUR_NAV: NavItem[] = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/recherche", label: t("searchShops"), icon: Search },
    { href: "/mes-reservations", label: t("myReservations"), icon: CalendarCheck },
    { href: "/messages", label: t("messages"), icon: MessageCircle },
  ];

  const ROLE_LABELS: Record<string, string> = {
    [UserRole.COMMERCANT]: t("roleCommercant"),
    [UserRole.ANNONCEUR]: t("roleAnnonceur"),
  };

  const nav = user.role === UserRole.COMMERCANT ? COMMERCANT_NAV : ANNONCEUR_NAV;
  const displayName =
    user.commercantProfile?.businessName || user.annonceurProfile?.companyName || user.email;

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar desktop, persistante */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-card md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-[1.05rem] font-semibold text-primary-foreground">
            M
          </span>
          <span className="font-heading text-[1.1rem] font-semibold tracking-tight">MiVitrina</span>
        </Link>

        <div className="flex-1 px-3">{navLinks()}</div>

        <div className="border-t border-border/60 p-3">
          <div className="mb-2 flex justify-end px-1">
            <LocaleSwitcher />
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <Badge variant="secondary" className="mt-1">
              {ROLE_LABELS[user.role]}
            </Badge>
            <LogoutButton variant="ghost" className="mt-2 w-full justify-start px-0 text-muted-foreground" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre mobile */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-card px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary font-heading text-sm font-semibold text-primary-foreground">
              M
            </span>
            <span className="font-heading text-base font-semibold">MiVitrina</span>
          </Link>
          <button
            type="button"
            aria-label={t("openMenuAria")}
            onClick={() => setMobileOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
        </header>

        {/* Panneau coulissant mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl">
              <div className="flex items-center justify-between px-5 py-5">
                <span className="font-heading text-lg font-semibold">MiVitrina</span>
                <button
                  type="button"
                  aria-label={t("closeMenuAria")}
                  onClick={() => setMobileOpen(false)}
                  className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                >
                  <X className="size-4.5" />
                </button>
              </div>
              <div className="flex-1 px-3">{navLinks(() => setMobileOpen(false))}</div>
              <div className="border-t border-border/60 p-3">
                <div className="mb-2 flex justify-end px-1">
                  <LocaleSwitcher />
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <Badge variant="secondary" className="mt-1">
                    {ROLE_LABELS[user.role]}
                  </Badge>
                  <LogoutButton variant="ghost" className="mt-2 w-full justify-start px-0 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
