"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@mivitrina/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Noms complets des langues — réutilisés par le menu mobile de l'en-tête. */
export const LOCALE_LABELS: Record<SupportedLocale, string> = { es: "Español", en: "English" };
/** Code court affiché dans le déclencheur — le nom complet reste dans la liste déroulante.
 * Évite un déclencheur trop large qui fait déborder le header sur mobile. */
const SHORT_LABELS: Record<SupportedLocale, string> = { es: "ES", en: "EN" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Select
      value={locale}
      onValueChange={(next) => router.replace(pathname, { locale: next as SupportedLocale })}
    >
      {/* h-11 (44px, cible tactile minimale) sous `lg`, compact (h-7) au-delà : le déclencheur `size="sm"`
          fixe sa hauteur via `data-[size=sm]:h-7`, plus spécifique qu'un simple `h-11` — d'où la variante
          data-* explicite. `aria-label` traduit (était "Langue" en dur, en français). */}
      <SelectTrigger
        size="sm"
        className="w-[4.25rem] shrink-0 data-[size=sm]:h-11 lg:data-[size=sm]:h-7"
        aria-label={t("language")}
      >
        {/* Base UI's Select.Value ne lit pas automatiquement le label de
            l'item sélectionné (contrairement à Radix) : il faut le mapper
            explicitement à partir de la valeur brute. */}
        <SelectValue>{(value: SupportedLocale) => SHORT_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LOCALE_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
