"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Menu, X, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoMark } from "@/components/logo-mark";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Coquille de navigation latérale partagée par les espaces authentifiés
 * (commerçant/annonceur, voir AppShell) ET l'espace admin (voir
 * AdminShell) — un seul endroit pour la lueur ambiante, la pastille
 * active animée et le panneau mobile, plutôt que dupliquer ~150 lignes
 * entre les deux : exactement l'esprit "système de composants réutilisable".
 */
export function SidebarShell({
  nav,
  footer,
  children,
}: {
  nav: NavItem[];
  /** Bloc en bas de la sidebar (nom affiché, badge de rôle, déconnexion...). */
  footer: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("AppShell");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return href === "/dashboard" || href === "/admin" ? pathname === href : pathname.startsWith(href);
  }

  /**
   * `scope` distingue la barre desktop de celle du panneau mobile : les
   * deux existent dans le DOM en même temps (la desktop reste montée,
   * juste masquée en CSS sous md), donc partager un seul `layoutId` entre
   * les deux ferait dérailler l'animation de la pastille active. Chacune
   * anime la sienne indépendamment.
   */
  const navLinks = (scope: "desktop" | "mobile", onNavigate?: () => void) => (
    // relative z-10 : passe au-dessus du calque de lueur (position:absolute
    // z-index:0), qui sinon peindrait par-dessus ce menu statique malgré
    // son ordre dans le DOM (règle de peinture CSS : un élément positionné
    // passe toujours au-dessus d'un élément statique, même s'il apparaît
    // avant lui dans le markup).
    <nav className="relative z-10 flex flex-col gap-1">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`nav-active-pill-${scope}`}
                className="absolute inset-0 rounded-lg bg-primary/10"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <item.icon className="relative z-10 size-4.5" />
            <span className="relative z-10">{item.label}</span>
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
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LogoMark className="size-5" />
          </span>
          <span className="font-heading text-[1.1rem] font-semibold tracking-tight">MiVitrina</span>
        </Link>

        {/* `ambient-drift-glow` comble l'espace vide sous une courte liste
            de menu par une lueur ambre qui dérive lentement, plutôt qu'un
            aplat blanc mort — retour utilisateur explicite. Le calque de
            lueur est en absolute derrière le menu, qui lui n'a aucun
            ancêtre overflow:hidden (sans quoi la pastille active se
            faisait tronquer, voir globals.css). */}
        <div className="relative flex-1 px-3">
          <div className="ambient-drift-glow" aria-hidden="true" />
          {navLinks("desktop")}
        </div>

        <div className="border-t border-border/60 p-3">
          <div className="mb-2 flex justify-end px-1">
            <LocaleSwitcher />
          </div>
          {footer}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre mobile */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-card px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LogoMark className="size-4.5" />
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
              <div className="relative flex-1 px-3">
                <div className="ambient-drift-glow" aria-hidden="true" />
                {navLinks("mobile", () => setMobileOpen(false))}
              </div>
              <div className="border-t border-border/60 p-3">
                <div className="mb-2 flex justify-end px-1">
                  <LocaleSwitcher />
                </div>
                {footer}
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
