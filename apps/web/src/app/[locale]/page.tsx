import { useTranslations } from "next-intl";
import { LottiePlayer } from "@/components/lottie-player";
import { Link } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";

/**
 * Landing page — placeholder de scaffolding.
 * Le contenu final (présentation du concept, sections pour commerçants
 * et annonceurs, preuve sociale...) sera construit à l'étape "pages".
 *
 * L'animation hero (public/animations/hero-poster-loop.json) a été générée
 * avec le skill "text-to-lottie" (.claude/skills/text-to-lottie, MIT,
 * diffusionstudio/lottie) : une affiche se pose sur une vitrine, confirmée
 * par un badge, en boucle — illustre le concept produit.
 */
export default function LandingPage() {
  const t = useTranslations("Landing");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <LottiePlayer
        src="/animations/hero-poster-loop.json"
        className="h-40 w-40"
        ariaLabel="Une affiche publicitaire se pose sur une vitrine de commerce"
      />
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="text-lg text-gray-600">{t("subtitle")}</p>
      <div className="flex gap-4">
        <Link
          href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }}
          className="rounded-md bg-black px-6 py-3 text-white"
        >
          {t("ctaCommercant")}
        </Link>
        <Link
          href={{ pathname: "/register", query: { role: UserRole.ANNONCEUR } }}
          className="rounded-md border border-black px-6 py-3"
        >
          {t("ctaAnnonceur")}
        </Link>
      </div>
    </main>
  );
}
