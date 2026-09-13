"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@mivitrina/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS: Record<SupportedLocale, string> = { fr: "Français", es: "Español" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Select
      value={locale}
      onValueChange={(next) => router.replace(pathname, { locale: next as SupportedLocale })}
    >
      <SelectTrigger size="sm" className="w-[110px]" aria-label="Langue">
        {/* Base UI's Select.Value ne lit pas automatiquement le label de
            l'item sélectionné (contrairement à Radix) : il faut le mapper
            explicitement à partir de la valeur brute. */}
        <SelectValue>{(value: SupportedLocale) => LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
