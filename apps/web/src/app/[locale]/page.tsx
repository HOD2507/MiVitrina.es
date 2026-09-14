import { useTranslations } from "next-intl";
import { LottiePlayer } from "@/components/lottie-player";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@mivitrina/shared";
import {
  Store,
  Wallet,
  ShieldCheck,
  Lock,
  MapPin,
  Camera,
  MessageCircle,
  Percent,
  CheckCircle2,
} from "lucide-react";

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

  const commercantSteps = [
    { title: t("stepsCommercant1Title"), desc: t("stepsCommercant1Desc") },
    { title: t("stepsCommercant2Title"), desc: t("stepsCommercant2Desc") },
    { title: t("stepsCommercant3Title"), desc: t("stepsCommercant3Desc") },
  ];

  const annonceurSteps = [
    { title: t("stepsAnnonceur1Title"), desc: t("stepsAnnonceur1Desc") },
    { title: t("stepsAnnonceur2Title"), desc: t("stepsAnnonceur2Desc") },
    { title: t("stepsAnnonceur3Title"), desc: t("stepsAnnonceur3Desc") },
  ];

  const features = [
    { icon: MapPin, title: t("featureGeoTitle"), desc: t("featureGeoDesc") },
    { icon: Lock, title: t("featurePaymentTitle"), desc: t("featurePaymentDesc") },
    { icon: ShieldCheck, title: t("featureVerificationTitle"), desc: t("featureVerificationDesc") },
    { icon: Camera, title: t("featurePhotoTitle"), desc: t("featurePhotoDesc") },
    { icon: MessageCircle, title: t("featureChatTitle"), desc: t("featureChatDesc") },
    { icon: Percent, title: t("featureCommissionTitle"), desc: t("featureCommissionDesc") },
  ];

  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="bg-mesh relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-16">
            <div className="flex flex-col items-center gap-7 text-center md:items-start md:text-left">
              <Badge variant="outline" className="gap-1.5 rounded-full border-primary/30 bg-background px-3.5 py-1.5">
                <MapPin className="size-3.5 text-primary" />
                {t("eyebrow")}
              </Badge>
              <h1 className="text-4xl leading-[1.08] font-medium tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
                {t("title")}
                <br />
                <span className="text-primary italic">{t("titleAccent")}</span>
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground text-balance">{t("subtitle")}</p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                <Button
                  className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20"
                  render={<Link href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }} />}
                >
                  {t("ctaCommercant")}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-foreground/15 px-7 text-base"
                  render={<Link href={{ pathname: "/register", query: { role: UserRole.ANNONCEUR } }} />}
                >
                  {t("ctaAnnonceur")}
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div
                aria-hidden
                className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-2xl"
              />
              <div className="flex aspect-square w-full max-w-sm items-center justify-center rounded-[1.75rem] border border-border bg-card p-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
                <LottiePlayer
                  src="/animations/hero-poster-loop.json"
                  className="h-full w-full"
                  ariaLabel="Une affiche publicitaire se pose sur une vitrine de commerce"
                />
              </div>
              <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:flex">
                <CheckCircle2 className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-xs font-semibold leading-tight">{t("trustVerifiedTitle")}</p>
                  <p className="text-[0.7rem] leading-tight text-muted-foreground">{t("trustVerifiedDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bandeau de confiance */}
        <section className="border-y border-border/60">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
            {trustItems.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="hover-lift flex h-full items-start gap-3.5 rounded-xl border border-transparent p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <p className="mb-2 text-sm font-medium text-primary">{t("stepsEyebrow")}</p>
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">{t("stepsTitle")}</h2>
            </Reveal>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <StepColumn icon={Store} heading={t("stepsCommercantHeading")} steps={commercantSteps} />
              <StepColumn icon={MapPin} heading={t("stepsAnnonceurHeading")} steps={annonceurSteps} delayOffset={150} />
            </div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <p className="mb-2 text-sm font-medium text-primary">{t("featuresEyebrow")}</p>
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">{t("featuresTitle")}</h2>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, desc }, i) => (
                <Reveal key={title} delay={(i % 3) * 90}>
                  <Card className="hover-lift h-full">
                    <CardHeader>
                      <span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <CardDescription>{desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-4 pb-20 sm:pb-28">
          <Reveal className="mx-auto max-w-6xl">
            <div className="bg-grain relative overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center text-ink-foreground sm:py-20">
              <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5">
                <h2 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
                  {t("finalCtaTitle")}
                </h2>
                <p className="text-balance text-ink-foreground/80">{t("finalCtaSubtitle")}</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="h-12 rounded-full px-7 text-base"
                    render={<Link href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }} />}
                  >
                    {t("ctaCommercant")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-ink-foreground/25 bg-transparent px-7 text-base text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                    render={<Link href={{ pathname: "/register", query: { role: UserRole.ANNONCEUR } }} />}
                  >
                    {t("ctaAnnonceur")}
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function StepColumn({
  icon: Icon,
  heading,
  steps,
  delayOffset = 0,
}: {
  icon: typeof Store;
  heading: string;
  steps: { title: string; desc: string }[];
  delayOffset?: number;
}) {
  return (
    <Reveal delay={delayOffset}>
      <div className="flex items-center gap-2.5 mb-8">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
        <h3 className="text-xl font-semibold">{heading}</h3>
      </div>
      <ol className="relative flex flex-col gap-8 border-l border-border pl-8">
        {steps.map((step, i) => (
          <li key={step.title} className="relative">
            <span className="absolute top-0 -left-[calc(2rem+1px)] flex size-8 items-center justify-center rounded-full border border-border bg-background font-heading text-sm font-semibold text-primary">
              {i + 1}
            </span>
            <p className="font-semibold">{step.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
