import { useTranslations } from "next-intl";
import { LottiePlayer } from "@/components/lottie-player";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@mivitrina/shared";

/**
 * Landing page. L'animation hero (public/animations/hero-poster-loop.json)
 * a été générée avec le skill "text-to-lottie" (.claude/skills/text-to-lottie,
 * MIT, diffusionstudio/lottie) : une affiche se pose sur une vitrine,
 * confirmée par un badge, en boucle — illustre le concept produit.
 */
export default function LandingPage() {
  const t = useTranslations("Landing");

  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 md:grid-cols-2 md:items-center md:gap-16">
          <div className="flex flex-col gap-6 text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
            <p className="text-lg text-muted-foreground text-balance">{t("subtitle")}</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              <Button size="lg" render={<Link href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }} />}>
                {t("ctaCommercant")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href={{ pathname: "/register", query: { role: UserRole.ANNONCEUR } }} />}
              >
                {t("ctaAnnonceur")}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex aspect-square w-full max-w-sm items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-sm">
              <LottiePlayer
                src="/animations/hero-poster-loop.json"
                className="h-full w-full"
                ariaLabel="Une affiche publicitaire se pose sur une vitrine de commerce"
              />
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="border-t border-border/60 bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">{t("howItWorksTitle")}</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">{t("cardCommercantTitle")}</CardTitle>
                  <CardDescription>{t("cardCommercantDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    render={<Link href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }} />}
                  >
                    {t("ctaCommercant")}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">{t("cardAnnonceurTitle")}</CardTitle>
                  <CardDescription>{t("cardAnnonceurDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    render={<Link href={{ pathname: "/register", query: { role: UserRole.ANNONCEUR } }} />}
                  >
                    {t("ctaAnnonceur")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
