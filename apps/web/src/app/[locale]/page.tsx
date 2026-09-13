import { useTranslations } from "next-intl";
import { LottiePlayer } from "@/components/lottie-player";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@mivitrina/shared";
import { Store, Megaphone, Wallet, ShieldCheck, Lock, MapPin } from "lucide-react";

/**
 * Landing page. L'animation hero (public/animations/hero-poster-loop.json)
 * a été générée avec le skill "text-to-lottie" (.claude/skills/text-to-lottie,
 * MIT, diffusionstudio/lottie) : une affiche se pose sur une vitrine,
 * confirmée par un badge, en boucle — illustre le concept produit.
 */
export default function LandingPage() {
  const t = useTranslations("Landing");

  const trustItems = [
    { icon: Wallet, title: t("trustNoUpfrontTitle"), desc: t("trustNoUpfrontDesc") },
    { icon: ShieldCheck, title: t("trustVerifiedTitle"), desc: t("trustVerifiedDesc") },
    { icon: Lock, title: t("trustSecurePaymentTitle"), desc: t("trustSecurePaymentDesc") },
  ];

  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 right-0 -z-10 h-[32rem] w-[32rem] -translate-y-1/3 translate-x-1/4 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 md:grid-cols-2 md:items-center md:gap-16">
            <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
              <Badge variant="outline" className="gap-1.5 px-3 py-1">
                <MapPin className="size-3.5" />
                {t("eyebrow")}
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
              <p className="text-lg text-muted-foreground text-balance">{t("subtitle")}</p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                <Button
                  size="lg"
                  render={<Link href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }} />}
                >
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
          </div>
        </section>

        {/* Bandeau de confiance */}
        <section className="border-y border-border/60 bg-card">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
            {trustItems.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">{t("howItWorksTitle")}</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <span className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Store className="size-5" />
                  </span>
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
                  <span className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Megaphone className="size-5" />
                  </span>
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

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:py-16">
            <h2 className="text-3xl font-bold tracking-tight text-balance">{t("finalCtaTitle")}</h2>
            <p className="max-w-xl text-balance text-primary-foreground/90">{t("finalCtaSubtitle")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                render={<Link href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }} />}
              >
                {t("ctaCommercant")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                render={<Link href={{ pathname: "/register", query: { role: UserRole.ANNONCEUR } }} />}
              >
                {t("ctaAnnonceur")}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
