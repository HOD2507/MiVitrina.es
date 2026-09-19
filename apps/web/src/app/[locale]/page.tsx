import { useTranslations } from "next-intl";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@mivitrina/shared";
import { PosterRing } from "@/components/poster-ring";
import { PointerGlow } from "@/components/pointer-glow";
import { IntroPosterSplash } from "@/components/intro-poster-splash";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from "@/components/ui/accordion";
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
  CalendarCheck,
  RotateCcw,
  ImagePlus,
  Handshake,
  Search,
  CreditCard,
} from "lucide-react";

/** Une couleur qui tourne par étape/fonctionnalité (palette "spotlight" — voir globals.css) plutôt qu'un unique bleu/orange partout : casse la monotonie visuelle pointée par l'utilisateur. */
const TONE_CYCLE = [
  { badge: "bg-primary/12 text-primary", tile: "bg-primary/5" },
  { badge: "bg-glow-amber/30 text-amber-800", tile: "bg-glow-amber/10" },
  { badge: "bg-glow-plum/14 text-glow-plum", tile: "bg-glow-plum/5" },
] as const;

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
    { icon: ImagePlus, title: t("stepsCommercant1Title"), desc: t("stepsCommercant1Desc") },
    { icon: Handshake, title: t("stepsCommercant2Title"), desc: t("stepsCommercant2Desc") },
    { icon: Wallet, title: t("stepsCommercant3Title"), desc: t("stepsCommercant3Desc") },
  ];

  const annonceurSteps = [
    { icon: Search, title: t("stepsAnnonceur1Title"), desc: t("stepsAnnonceur1Desc") },
    { icon: CreditCard, title: t("stepsAnnonceur2Title"), desc: t("stepsAnnonceur2Desc") },
    { icon: Camera, title: t("stepsAnnonceur3Title"), desc: t("stepsAnnonceur3Desc") },
  ];

  // Ex-doublons avec le bandeau de confiance (Pago seguro / Verificación
  // manual apparaissaient dans les deux sections) remplacés par deux
  // fonctionnalités réelles pas encore mentionnées ailleurs sur la page.
  const features = [
    { icon: MapPin, title: t("featureGeoTitle"), desc: t("featureGeoDesc") },
    { icon: CalendarCheck, title: t("featureCalendarTitle"), desc: t("featureCalendarDesc") },
    { icon: RotateCcw, title: t("featureRefundTitle"), desc: t("featureRefundDesc") },
    { icon: Camera, title: t("featurePhotoTitle"), desc: t("featurePhotoDesc") },
    { icon: MessageCircle, title: t("featureChatTitle"), desc: t("featureChatDesc") },
    { icon: Percent, title: t("featureCommissionTitle"), desc: t("featureCommissionDesc") },
  ];

  const faqItems = [
    { q: t("faqQ1"), a: t("faqA1") },
    { q: t("faqQ2"), a: t("faqA2") },
    { q: t("faqQ3"), a: t("faqA3") },
    { q: t("faqQ4"), a: t("faqA4") },
    { q: t("faqQ5"), a: t("faqA5") },
    { q: t("faqQ6"), a: t("faqA6") },
  ];

  return (
    <>
      <SmoothScroll />
      <IntroPosterSplash />
      <SiteHeader />

      <main>
        {/* Hero */}
        <PointerGlow className="bg-mesh relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-16">
            <div className="flex flex-col items-center gap-7 text-center md:items-start md:text-left">
              <Badge
                variant="outline"
                className="gap-2 rounded-full border-primary/20 bg-background px-3.5 py-1.5 shadow-sm"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                {t("eyebrow")}
              </Badge>
              <h1 className="font-heading text-5xl leading-[1.08] font-extrabold tracking-tighter text-balance sm:text-6xl lg:text-[4.5rem]">
                {t("title")}
                <br />
                <span className="text-shimmer">{t("titleAccent")}</span>
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground text-balance">{t("subtitle")}</p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                <Button
                  className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20 transition-transform duration-200 hover:scale-[1.06] active:scale-95"
                  render={<Link href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }} />}
                >
                  {t("ctaCommercant")}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-foreground/15 px-7 text-base transition-transform duration-200 hover:scale-[1.06] active:scale-95"
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
              <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border shadow-[0_24px_60px_-24px_rgba(0,0,0,0.3)]">
                <Image
                  src="/images/hero-storefront.jpg"
                  alt={t("heroImageAlt")}
                  width={1000}
                  height={1000}
                  priority
                  className="aspect-square w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 hidden items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-lg sm:flex">
                <CheckCircle2 className="size-5 text-primary" />
                <div className="text-left">
                  <p className="text-xs font-semibold leading-tight">{t("trustVerifiedTitle")}</p>
                  <p className="text-[0.7rem] leading-tight text-muted-foreground">{t("trustVerifiedDesc")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bandeau de confiance — volontairement dans la même section que
              le hero (même bg-mesh, aucune bordure entre les deux) pour que
              ça se lise comme un seul bloc continu plutôt que deux
              encadrés empilés. */}
          <div className="mx-auto grid max-w-6xl gap-4 border-t border-border/40 px-4 py-10 sm:grid-cols-3">
            {trustItems.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="spotlight-hover hover-lift flex h-full items-start gap-3.5 rounded-xl border border-border/50 bg-background/60 p-4 backdrop-blur-sm">
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
        </PointerGlow>

        {/* Galerie — de vraies affiches, tous types d'événements confondus */}
        <section className="bg-mesh-panel py-20 sm:py-28">
          <Reveal className="mx-auto mb-14 max-w-xl px-4 text-center">
            <p className="mb-2 text-sm font-medium text-primary">{t("galleryEyebrow")}</p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">{t("galleryTitle")}</h2>
            <p className="mt-3 text-muted-foreground text-balance">{t("gallerySubtitle")}</p>
          </Reveal>

          <PosterRing
            hint={t("galleryDragHint")}
            posters={[
              { src: "/images/poster-concert.jpg", label: t("galleryPoster1Label"), alt: t("galleryPoster1Alt") },
              { src: "/images/poster-theatre.jpg", label: t("galleryPoster2Label"), alt: t("galleryPoster2Alt") },
              { src: "/images/poster-mode.jpg", label: t("galleryPoster3Label"), alt: t("galleryPoster3Alt") },
              { src: "/images/poster-affiches.jpg", label: t("galleryPoster4Label"), alt: t("galleryPoster4Alt") },
              { src: "/images/poster-market.jpg", label: t("galleryPoster5Label"), alt: t("galleryPoster5Alt") },
              { src: "/images/poster-stage-lights.jpg", label: t("galleryPoster6Label"), alt: t("galleryPoster6Alt") },
              { src: "/images/poster-graffiti.jpg", label: t("galleryPoster7Label"), alt: t("galleryPoster7Alt") },
              { src: "/images/poster-confetti.jpg", label: t("galleryPoster8Label"), alt: t("galleryPoster8Alt") },
            ]}
          />
        </section>

        {/* Comment ça marche */}
        <section id="como-funciona" className="scroll-mt-24 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <p className="mb-2 text-sm font-medium text-primary">{t("stepsEyebrow")}</p>
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{t("stepsTitle")}</h2>
            </Reveal>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <StepColumn icon={Store} heading={t("stepsCommercantHeading")} steps={commercantSteps} />
              <StepColumn icon={MapPin} heading={t("stepsAnnonceurHeading")} steps={annonceurSteps} delayOffset={150} />
            </div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="funcionalidades" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <p className="mb-2 text-sm font-medium text-primary">{t("featuresEyebrow")}</p>
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{t("featuresTitle")}</h2>
            </Reveal>

            {/* Mosaïque "bento" plutôt qu'une grille de rectangles identiques
                (retour utilisateur) : les 2 premières fonctionnalités sont
                mises en avant (tuile large, teintée, icône plus grosse), les
                4 suivantes restent compactes et sans bordure — la section
                cesse de se lire comme "6 boîtes pareilles". */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, desc }, i) => {
                const tone = TONE_CYCLE[i % TONE_CYCLE.length];
                const featured = i < 2;
                return (
                  <Reveal key={title} delay={i * 70} className={featured ? "sm:col-span-2" : ""}>
                    {featured ? (
                      <div
                        className={`spotlight-hover hover-lift h-full rounded-3xl border border-border/60 p-7 ${tone.tile}`}
                      >
                        <span className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${tone.badge}`}>
                          <Icon className="size-6" />
                        </span>
                        <p className="font-heading text-xl font-bold">{title}</p>
                        <p className="mt-2 max-w-sm text-muted-foreground">{desc}</p>
                      </div>
                    ) : (
                      <div className="hover-lift flex h-full flex-col gap-3 rounded-2xl p-5">
                        <span className={`flex size-10 items-center justify-center rounded-xl ${tone.badge}`}>
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <p className="font-semibold">{title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                    )}
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 bg-mesh-panel">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:py-28">
            <Reveal className="mx-auto mb-12 max-w-xl text-center">
              <p className="mb-2 text-sm font-medium text-primary">{t("faqEyebrow")}</p>
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{t("faqTitle")}</h2>
            </Reveal>

            <Reveal delay={100}>
              <Accordion className="rounded-2xl border border-border bg-card px-6">
                {faqItems.map(({ q, a }) => (
                  <AccordionItem key={q} value={q}>
                    <AccordionTrigger>{q}</AccordionTrigger>
                    <AccordionPanel>{a}</AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-4 pb-20 sm:pb-28">
          <Reveal className="mx-auto max-w-6xl">
            <PointerGlow
              as="div"
              tone="plum"
              className="bg-grain relative overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center text-ink-foreground sm:py-20"
            >
              <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5">
                <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  {t("finalCtaTitle")}
                </h2>
                <p className="text-balance text-ink-foreground/80">{t("finalCtaSubtitle")}</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="h-12 rounded-full px-7 text-base transition-transform duration-200 hover:scale-[1.06] active:scale-95"
                    render={<Link href={{ pathname: "/register", query: { role: UserRole.COMMERCANT } }} />}
                  >
                    {t("ctaCommercant")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-ink-foreground/25 bg-transparent px-7 text-base text-ink-foreground transition-transform duration-200 hover:scale-[1.06] hover:bg-ink-foreground/10 hover:text-ink-foreground active:scale-95"
                    render={<Link href={{ pathname: "/register", query: { role: UserRole.ANNONCEUR } }} />}
                  >
                    {t("ctaAnnonceur")}
                  </Button>
                </div>
              </div>
            </PointerGlow>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/** Une couleur par étape (cycle TONE_CYCLE) plutôt qu'un seul cercle
 * orange répété 3 fois — casse la monotonie, chaque étape se distingue
 * au premier coup d'œil. Chaque étape apparaît individuellement en
 * cascade (au lieu de toute la colonne d'un coup) pour un défilement
 * plus vivant. */
function StepColumn({
  icon: Icon,
  heading,
  steps,
  delayOffset = 0,
}: {
  icon: typeof Store;
  heading: string;
  steps: { icon: typeof Store; title: string; desc: string }[];
  delayOffset?: number;
}) {
  return (
    <div>
      <Reveal delay={delayOffset}>
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4.5" />
          </span>
          <h3 className="text-xl font-semibold">{heading}</h3>
        </div>
      </Reveal>
      <ol className="relative flex flex-col gap-8 border-l-2 border-dashed border-primary/25 pl-8">
        {steps.map((step, i) => {
          const tone = TONE_CYCLE[i % TONE_CYCLE.length];
          const StepIcon = step.icon;
          return (
            <Reveal key={step.title} delay={delayOffset + 120 + i * 130}>
              <li className="spotlight-hover hover-lift relative -m-2 rounded-xl p-2">
                <span
                  className={`absolute top-0 -left-[calc(2rem+1px)] flex size-8 items-center justify-center rounded-full font-heading text-sm font-bold ${tone.badge}`}
                >
                  {i + 1}
                </span>
                <div className="flex items-center gap-2">
                  <StepIcon className="size-4 text-muted-foreground" />
                  <p className="font-semibold">{step.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              </li>
            </Reveal>
          );
        })}
      </ol>
    </div>
  );
}
