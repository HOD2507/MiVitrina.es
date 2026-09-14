"use client";

import { cn } from "cn";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/verifications", label: "Vérifications" },
  { href: "/admin/disputes", label: "Litiges" },
  { href: "/admin/settings", label: "Réglages" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-4 flex gap-1 border-b border-border">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
