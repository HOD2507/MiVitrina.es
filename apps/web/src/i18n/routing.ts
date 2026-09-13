import { defineRouting } from "next-intl/routing";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@mivitrina/shared";

/**
 * Configuration de routing i18n. Marchés MVP : France (fr) et Espagne (es).
 * Le préfixe de langue est toujours présent dans l'URL (ex: /fr/..., /es/...)
 * pour un SEO clair par marché.
 */
export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
});
