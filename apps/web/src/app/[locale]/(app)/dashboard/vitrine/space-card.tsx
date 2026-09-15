"use client";

import { useRef, useState } from "react";
import { MoreVertical, Plus, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { uploadPhoto } from "@/lib/upload-photo";
import type { PricingOption, VitrineSpace } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SIZE_LABELS } from "./space-form-dialog";
import { DURATION_LABELS } from "./pricing-option-dialog";

interface SpaceCardProps {
  space: VitrineSpace;
  onEdit: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (space: VitrineSpace) => void;
  onAddPricing: () => void;
}

export function SpaceCard({ space, onEdit, onDeleted, onUpdated, onAddPricing }: SpaceCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleDeleteSpace() {
    if (!confirm(`Supprimer l'espace "${space.name}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/vitrine-spaces/${space.id}`);
      toast.success("Espace supprimé.");
      onDeleted(space.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Suppression impossible.");
    }
  }

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { key } = await uploadPhoto(file, "space-photo");
      const photo = await api.post<{ id: string; url: string }>(`/vitrine-spaces/${space.id}/photos`, { key });
      onUpdated({ ...space, photos: [...space.photos, photo] });
      toast.success("Photo ajoutée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      await api.delete(`/vitrine-spaces/${space.id}/photos/${photoId}`);
      onUpdated({ ...space, photos: space.photos.filter((p) => p.id !== photoId) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Suppression impossible.");
    }
  }

  async function handleDeletePricing(pricingOption: PricingOption) {
    try {
      await api.delete(`/vitrine-spaces/${space.id}/pricing-options/${pricingOption.id}`);
      onUpdated({ ...space, pricingOptions: space.pricingOptions.filter((p) => p.id !== pricingOption.id) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Suppression impossible.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            {space.name}
            {!space.isActive && <Badge variant="secondary">Désactivé</Badge>}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {space.sizePreset === "CUSTOM" ? space.customSizeLabel : SIZE_LABELS[space.sizePreset]}
            {space.widthCm && space.heightCm ? ` · ${space.widthCm}×${space.heightCm} cm` : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Modifier</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleDeleteSpace}>
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {space.description && <p className="text-sm text-muted-foreground">{space.description}</p>}

        {/* Photos */}
        <div className="flex flex-wrap gap-2">
          {space.photos.map((photo) => (
            <div key={photo.id} className="group relative size-20 overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.id)}
                aria-label="Supprimer la photo"
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={`Ajouter une photo pour ${space.name}`}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <ImagePlus className="size-5" />
            <span className="text-[0.65rem]">Ajouter</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />
        </div>

        {/* Tarifs */}
        <div className="flex flex-col gap-2">
          {space.pricingOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun tarif défini pour cet espace.</p>
          )}
          {space.pricingOptions.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                {DURATION_LABELS[option.durationType]}
                {option.minDurationDays ? ` (min. ${option.minDurationDays}j)` : ""}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{Number(option.price).toFixed(2)} €</span>
                <button
                  type="button"
                  onClick={() => handleDeletePricing(option)}
                  aria-label="Supprimer ce tarif"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={onAddPricing}>
            <Plus className="size-3.5" />
            Ajouter un tarif
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
