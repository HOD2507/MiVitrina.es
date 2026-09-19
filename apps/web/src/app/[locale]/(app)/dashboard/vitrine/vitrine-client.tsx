"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, ImagePlus, ShieldCheck, Store, MapPin, MapPinOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { VerificationStatus } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import { uploadPhoto } from "@/lib/upload-photo";
import type { MyVitrine, VitrineSpace, PricingOption, Photo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";
import { SpaceCard } from "./space-card";
import { SpaceFormDialog } from "./space-form-dialog";
import { PricingOptionDialog } from "./pricing-option-dialog";

export function VitrineClient({ initialVitrine }: { initialVitrine: MyVitrine | null }) {
  const t = useTranslations("Vitrine");
  const tErrors = useTranslations("Auth.errors");
  const [profile, setProfile] = useState(initialVitrine?.profile ?? null);
  const [description, setDescription] = useState(initialVitrine?.profile.description ?? "");
  const [savingDescription, setSavingDescription] = useState(false);

  const [businessName, setBusinessName] = useState(initialVitrine?.profile.businessName ?? "");
  const [addressLine1, setAddressLine1] = useState(initialVitrine?.profile.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(initialVitrine?.profile.addressLine2 ?? "");
  const [city, setCity] = useState(initialVitrine?.profile.city ?? "");
  const [postalCode, setPostalCode] = useState(initialVitrine?.profile.postalCode ?? "");
  const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
  const [showcasePhotos, setShowcasePhotos] = useState<Photo[]>(initialVitrine?.showcasePhotos ?? []);
  const [spaces, setSpaces] = useState<VitrineSpace[]>(initialVitrine?.spaces ?? []);

  const [uploadingShowcase, setUploadingShowcase] = useState(false);
  const showcaseInputRef = useRef<HTMLInputElement>(null);

  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<VitrineSpace | undefined>(undefined);
  const [pricingDialogSpaceId, setPricingDialogSpaceId] = useState<string | null>(null);

  if (!profile) {
    return <p className="text-muted-foreground">{t("loadError")}</p>;
  }

  async function handleSaveDescription() {
    setSavingDescription(true);
    try {
      await api.patch("/commercants/me", { description });
      toast.success(t("saveDescriptionSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSavingDescription(false);
    }
  }

  async function handleSaveBusinessInfo() {
    setSavingBusinessInfo(true);
    try {
      const updated = await api.patch<{
        businessName: string;
        addressLine1: string;
        addressLine2: string | null;
        city: string;
        postalCode: string;
        latitude: number | null;
        longitude: number | null;
        geocodeFailed: boolean;
      }>("/commercants/me", { businessName, addressLine1, addressLine2, city, postalCode });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              businessName: updated.businessName,
              addressLine1: updated.addressLine1,
              addressLine2: updated.addressLine2,
              city: updated.city,
              postalCode: updated.postalCode,
              hasCoordinates: updated.latitude != null && updated.longitude != null,
            }
          : prev,
      );

      if (updated.geocodeFailed) {
        toast.warning(t("geocodeFailedWarning"));
      } else {
        toast.success(t("saveBusinessInfoSuccess"));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSavingBusinessInfo(false);
    }
  }

  async function handleAddShowcasePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingShowcase(true);
    try {
      const { key } = await uploadPhoto(file, "showcase-photo");
      const photo = await api.post<Photo>("/commercants/me/showcase-photos", { key });
      setShowcasePhotos((prev) => [...prev, photo]);
      toast.success(t("photoAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadImpossible"));
    } finally {
      setUploadingShowcase(false);
      if (showcaseInputRef.current) showcaseInputRef.current.value = "";
    }
  }

  async function handleDeleteShowcasePhoto(id: string) {
    try {
      await api.delete(`/commercants/me/showcase-photos/${id}`);
      setShowcasePhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("deleteImpossible"));
    }
  }

  function openCreateSpaceDialog() {
    setEditingSpace(undefined);
    setSpaceDialogOpen(true);
  }

  function openEditSpaceDialog(space: VitrineSpace) {
    setEditingSpace(space);
    setSpaceDialogOpen(true);
  }

  function handleSpaceSaved(saved: VitrineSpace) {
    setSpaces((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      if (exists) {
        return prev.map((s) => (s.id === saved.id ? { ...s, ...saved, photos: s.photos, pricingOptions: s.pricingOptions } : s));
      }
      return [...prev, saved];
    });
  }

  function handleSpaceDeleted(id: string) {
    setSpaces((prev) => prev.filter((s) => s.id !== id));
  }

  function handleSpaceUpdated(updated: VitrineSpace) {
    setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handlePricingSaved(pricingOption: PricingOption) {
    setSpaces((prev) =>
      prev.map((s) => (s.id === pricingOption.spaceId ? { ...s, pricingOptions: [...s.pricingOptions, pricingOption] } : s)),
    );
  }

  return (
    <div className="bg-mesh-panel flex flex-col gap-6">
      <Reveal>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t("title")}</p>
          <h1 className="mt-1 font-heading text-4xl font-extrabold tracking-tight text-primary">
            {profile.businessName}
          </h1>
        </div>
      </Reveal>

      {profile.verificationStatus !== VerificationStatus.VERIFIED && (
        <Reveal delay={60}>
          <div className="flex items-center gap-3 rounded-2xl border border-glow-amber/40 bg-gradient-to-br from-glow-amber/15 to-transparent p-4 shadow-sm">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-glow-amber text-primary-foreground shadow-sm">
              <ShieldCheck className="size-4.5" />
            </span>
            <p className="text-sm text-amber-900 dark:text-amber-300">{t("notVerifiedWarning")}</p>
          </div>
        </Reveal>
      )}

      {/* Nom et adresse — corrige une vraie lacune : jusqu'ici, seule la
          description était modifiable après l'inscription. Une adresse
          mal saisie rendait le commerce invisible dans la recherche
          géolocalisée sans aucun moyen de la corriger. */}
      <Reveal delay={120}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("businessInfoTitle")}</CardTitle>
          <CardDescription>{t("businessInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessName">{t("businessNameLabel")}</Label>
            <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addressLine1">{t("addressLine1Label")}</Label>
              <Input id="addressLine1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addressLine2">{t("addressLine2Label")}</Label>
              <Input id="addressLine2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">{t("cityLabel")}</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="postalCode">{t("postalCodeLabel")}</Label>
              <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
          </div>

          <div
            className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
              profile.hasCoordinates
                ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                : "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
            }`}
          >
            {profile.hasCoordinates ? (
              <MapPin className="size-4.5 shrink-0" />
            ) : (
              <MapPinOff className="size-4.5 shrink-0" />
            )}
            <p>
              {profile.hasCoordinates
                ? profile.verificationStatus === VerificationStatus.VERIFIED
                  ? t("mapVisibleHint")
                  : t("mapPendingVerificationHint")
                : t("mapNoCoordinatesHint")}
            </p>
          </div>

          <Button size="sm" className="self-start" onClick={handleSaveBusinessInfo} disabled={savingBusinessInfo}>
            {t("save")}
          </Button>
        </CardContent>
      </Card>
      </Reveal>

      {/* Description */}
      <Reveal delay={160}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("descriptionTitle")}</CardTitle>
          <CardDescription>{t("descriptionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            rows={4}
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button size="sm" className="self-start" onClick={handleSaveDescription} disabled={savingDescription}>
            {t("save")}
          </Button>
        </CardContent>
      </Card>
      </Reveal>

      {/* Photos générales */}
      <Reveal delay={200}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("photosTitle")}</CardTitle>
          <CardDescription>{t("photosDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {showcasePhotos.map((photo) => (
              <div key={photo.id} className="group relative size-24 overflow-hidden rounded-lg border border-border shadow-sm transition-shadow hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDeleteShowcasePhoto(photo.id)}
                  aria-label={t("deletePhotoAria")}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => showcaseInputRef.current?.click()}
              disabled={uploadingShowcase}
              aria-label={t("addPhotoAria")}
              className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50"
            >
              <ImagePlus className="size-5" />
              <span className="text-xs">{t("add")}</span>
            </button>
            <input
              ref={showcaseInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddShowcasePhoto}
            />
          </div>
        </CardContent>
      </Card>
      </Reveal>

      {/* Espaces */}
      <Reveal delay={240}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t("spacesTitle")} <Badge variant="secondary">{spaces.length}</Badge>
          </h2>
          <Button
            size="sm"
            className="transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            onClick={openCreateSpaceDialog}
          >
            <Plus className="size-4" />
            {t("addSpace")}
          </Button>
        </div>

        {spaces.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <EmptyState
              icon={Store}
              title={t("noSpacesYet")}
              className="py-8"
            />
            <div className="flex justify-center pb-6">
              <Button size="sm" onClick={openCreateSpaceDialog}>
                <Plus className="size-4" />
                {t("addSpace")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onEdit={() => openEditSpaceDialog(space)}
                onDeleted={handleSpaceDeleted}
                onUpdated={handleSpaceUpdated}
                onAddPricing={() => setPricingDialogSpaceId(space.id)}
              />
            ))}
          </div>
        )}
      </div>
      </Reveal>

      <SpaceFormDialog
        open={spaceDialogOpen}
        onOpenChange={setSpaceDialogOpen}
        space={editingSpace}
        onSaved={handleSpaceSaved}
      />

      {pricingDialogSpaceId && (
        <PricingOptionDialog
          open={Boolean(pricingDialogSpaceId)}
          onOpenChange={(open) => !open && setPricingDialogSpaceId(null)}
          spaceId={pricingDialogSpaceId}
          onSaved={handlePricingSaved}
        />
      )}
    </div>
  );
}
