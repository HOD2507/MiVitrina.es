import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Info, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { serverApiGet } from "@/lib/api-server";
import { getAnnonceurPanelHref } from "@/lib/get-annonceur-panel-href";
import type { PublicCommerceProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ContactCommerceButton } from "@/components/contact-commerce-button";
import { BackLink } from "@/components/back-link";

export default async function CommerceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("Vitrine");
  const tPricing = await getTranslations("Pricing");
  const tNav = await getTranslations("Nav");
  const DURATION_LABELS: Record<string, string> = {
    SEMAINE: tPricing("weekly"),
    MOIS: tPricing("monthly"),
    LIBRE: tPricing("free"),
  };
  const SIZE_LABELS: Record<string, string> = {
    A5: "A5",
    A4: "A4",
    A3: "A3",
    A2: "A2",
    A1: "A1",
    VITRINE_ENTIERE: t("sizeVitrineEntiere"),
    CUSTOM: "",
  };
  const { data: commerce, status } = await serverApiGet<PublicCommerceProfile>(`/discovery/commercants/${id}`);

  if (status === 404 || !commerce) {
    notFound();
  }

  const panelHref = await getAnnonceurPanelHref();
  const profile = commerce as PublicCommerceProfile;
  const allPhotos = [...profile.showcasePhotos, ...profile.spaces.flatMap((s) => s.photos)];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader hideAuthLinks={Boolean(panelHref)} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {/* "← Mi panel" va junto a "← Volver a resultados" (no en la barra superior); flex-wrap: en
            pantallas estrechas pasa a la línea siguiente en vez de desbordar. */}
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <BackLink href="/recherche" label={t("backToResults")} />
          {panelHref && <BackLink href={panelHref} label={tNav("myPanel")} />}
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{profile.businessName}</h1>
            <p className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" />
              {profile.addressLine1}, {profile.postalCode} {profile.city}
            </p>
          </div>
          <ContactCommerceButton commercantProfileId={profile.id} />
        </div>

        {allPhotos.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {allPhotos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={photo.url}
                alt=""
                className="h-48 w-64 shrink-0 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}

        {profile.description && <p className="mb-6 text-muted-foreground">{profile.description}</p>}

        <h2 className="mb-4 text-lg font-semibold">
          {t("availableSpacesTitle", { count: profile.spaces.length })}
        </h2>
        {!profile.bookable && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">{t("notBookableTitle")}</p>
              <p className="mt-0.5">{t("notBookableDesc")}</p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-4">
          {profile.spaces.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">{t("noSpacesPublished")}</CardContent>
            </Card>
          )}

          {profile.spaces.map((space) => (
            <Card key={space.id}>
              <CardHeader>
                <CardTitle className="text-lg">{space.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {space.sizePreset === "CUSTOM" ? space.customSizeLabel : SIZE_LABELS[space.sizePreset]}
                  {space.widthCm && space.heightCm ? ` · ${space.widthCm}×${space.heightCm} cm` : ""}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {space.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {space.photos.map((photo) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt=""
                        className="h-24 w-24 shrink-0 rounded-md border border-border object-cover"
                      />
                    ))}
                  </div>
                )}

                {space.description && <p className="text-sm text-muted-foreground">{space.description}</p>}

                <div className="flex flex-col gap-2">
                  {space.pricingOptions.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span>
                        {DURATION_LABELS[option.durationType]}
                        {option.minDurationDays ? ` ${t("minDays", { days: option.minDurationDays })}` : ""}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{Number(option.price).toFixed(2)} €</span>
                        {profile.bookable && (
                          <Button
                            size="sm"
                            render={
                              <Link
                                href={{
                                  pathname: "/reserver",
                                  query: {
                                    spaceId: space.id,
                                    pricingOptionId: option.id,
                                    businessName: profile.businessName,
                                    spaceName: space.name,
                                    durationType: option.durationType,
                                    price: option.price,
                                    minDurationDays: option.minDurationDays ?? undefined,
                                  },
                                }}
                              />
                            }
                          >
                            {t("bookCta")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {space.pricingOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("noPricingPublished")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
