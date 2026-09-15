"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, ImagePlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { VerificationStatus } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import { uploadPhoto } from "@/lib/upload-photo";
import type { MyVitrine, VitrineSpace, PricingOption, Photo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpaceCard } from "./space-card";
import { SpaceFormDialog } from "./space-form-dialog";
import { PricingOptionDialog } from "./pricing-option-dialog";

export function VitrineClient({ initialVitrine }: { initialVitrine: MyVitrine | null }) {
  const t = useTranslations("Vitrine");
  const tErrors = useTranslations("Auth.errors");
  const [profile] = useState(initialVitrine?.profile ?? null);
  const [description, setDescription] = useState(initialVitrine?.profile.description ?? "");
  const [savingDescription, setSavingDescription] = useState(false);
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{profile.businessName}</p>
      </div>

      {profile.verificationStatus !== VerificationStatus.VERIFIED && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldCheck className="size-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">{t("notVerifiedWarning")}</p>
          </CardContent>
        </Card>
      )}

      {/* Description */}
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

      {/* Photos générales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("photosTitle")}</CardTitle>
          <CardDescription>{t("photosDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {showcasePhotos.map((photo) => (
              <div key={photo.id} className="group relative size-24 overflow-hidden rounded-md border border-border">
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
              className="flex size-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
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

      {/* Espaces */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t("spacesTitle")} <Badge variant="secondary">{spaces.length}</Badge>
          </h2>
          <Button size="sm" onClick={openCreateSpaceDialog}>
            <Plus className="size-4" />
            {t("addSpace")}
          </Button>
        </div>

        {spaces.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">{t("noSpacesYet")}</CardContent>
          </Card>
        )}

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
