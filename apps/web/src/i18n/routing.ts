import { defineRouting } from "next-intl/routing";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@mivitrina/shared";

/**
 * Configuration de routing i18n. Lancement recentré sur l'Espagne : espagnol
 * (es) et anglais (en), le français a été retiré. Le préfixe de langue est
 * toujours présent dans l'URL (ex: /es/..., /en/...) pour un SEO clair.
 */
export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
});
