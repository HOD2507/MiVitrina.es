"use client";

import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@mivitrina/shared";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_LABELS } from "@/components/locale-switcher";

/** Chaque ligne du menu fait 44px de haut : cible tactile minimale (WCAG 2.5.5 / HIG Apple). */
const ITEM = "h-11 gap-3 rounded-lg px-3 text-base";

/**
 * Menu de l'en-tête public sous `lg` : l'en-tête ne garde que logo + « Regístrate » + ce bouton ☰,
 * ce qui tient jusqu'à 320px (logo + connexion + inscription + langue demandaient 408px et faisaient
 * déborder toute la page). Contient ce que le bureau affiche en ligne : recherche, sections de
 * l'accueil, connexion, langue.
 *
 * Basé sur DropdownMenu (Base UI) plutôt qu'un panneau maison : gère seul Échap, le focus, la
 * navigation au clavier, le clic extérieur et la fermeture après un choix — y compris pour un lien
 * `#ancre` sur la page d'accueil, où la navigation ne démonte rien.
 */
export function SiteHeaderMobileMenu({ hideAuthLinks }: { hideAuthLinks?: boolean }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("menuOpen")}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted"
      >
        <Menu className="size-6" />
      </DropdownMenuTrigger>

      {/* Largeur : 18rem, plafonnée à l'écran moins 1,5rem — tient dans 320px. */}
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(18rem,calc(100vw-1.5rem))] p-2">
        <DropdownMenuItem className={ITEM} render={<Link href="/recherche" />}>
          {t("search")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className={ITEM} render={<Link href={{ pathname: "/", hash: "como-funciona" }} />}>
          {t("howItWorks")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM} render={<Link href={{ pathname: "/", hash: "funcionalidades" }} />}>
          {t("features")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM} render={<Link href={{ pathname: "/", hash: "faq" }} />}>
          {t("faq")}
        </DropdownMenuItem>

        {!hideAuthLinks && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={ITEM} render={<Link href="/login" />}>
              {t("login")}
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-1.5">{t("language")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(next) => router.replace(pathname, { locale: next as SupportedLocale })}
          >
            {SUPPORTED_LOCALES.map((code) => (
              <DropdownMenuRadioItem key={code} value={code} className={`${ITEM} pr-10`}>
                {LOCALE_LABELS[code]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
