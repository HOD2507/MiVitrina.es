import { useTranslations } from "next-intl";

/**
 * Landing page — placeholder de scaffolding.
 * Le contenu final (présentation du concept, sections pour commerçants
 * et annonceurs, preuve sociale...) sera construit à l'étape "pages".
 */
export default function LandingPage() {
  const t = useTranslations("Landing");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="text-lg text-gray-600">{t("subtitle")}</p>
      <div className="flex gap-4">
        <button className="rounded-md bg-black px-6 py-3 text-white">{t("ctaCommercant")}</button>
        <button className="rounded-md border border-black px-6 py-3">{t("ctaAnnonceur")}</button>
      </div>
    </main>
  );
}
