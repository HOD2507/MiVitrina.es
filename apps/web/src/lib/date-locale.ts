/**
 * Tag BCP-47 à utiliser pour `Intl.DateTimeFormat`/`toLocaleDateString`,
 * dérivé de la locale de navigation (`SupportedLocale`, "es"/"en"). En
 * anglais on garde l'ordre jour/mois (en-GB) plutôt que mois/jour
 * (en-US) : le public visé est en Espagne, pas aux États-Unis.
 */
const INTL_LOCALE: Record<string, string> = { es: "es-ES", en: "en-GB" };

export function getDateLocale(locale: string): string {
  return INTL_LOCALE[locale] ?? "es-ES";
}
