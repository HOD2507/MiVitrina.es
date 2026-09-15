"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PosterSizePreset } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import type { VitrineSpace } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIZE_LABELS: Record<PosterSizePreset, string> = {
  A5: "A5",
  A4: "A4",
  A3: "A3",
  A2: "A2",
  A1: "A1",
  VITRINE_ENTIERE: "Vitrine entière",
  CUSTOM: "Dimensions personnalisées",
};

interface SpaceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Espace existant à modifier ; absent = création. */
  space?: VitrineSpace;
  onSaved: (space: VitrineSpace) => void;
}

export function SpaceFormDialog({ open, onOpenChange, space, onSaved }: SpaceFormDialogProps) {
  const [name, setName] = useState("");
  const [sizePreset, setSizePreset] = useState<PosterSizePreset>(PosterSizePreset.A4);
  const [customSizeLabel, setCustomSizeLabel] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(space?.name ?? "");
      setSizePreset(space?.sizePreset ?? PosterSizePreset.A4);
      setCustomSizeLabel(space?.customSizeLabel ?? "");
      setWidthCm(space?.widthCm ? String(space.widthCm) : "");
      setHeightCm(space?.heightCm ? String(space.heightCm) : "");
      setDescription(space?.description ?? "");
    }
  }, [open, space]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        sizePreset,
        customSizeLabel: sizePreset === PosterSizePreset.CUSTOM ? customSizeLabel : undefined,
        widthCm: widthCm ? Number(widthCm) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        description: description || undefined,
      };

      // L'API ne renvoie pas les relations photos/pricingOptions sur
      // create/update (pas de `include` côté back — inutile ici) : on les
      // rajoute nous-mêmes avant de fusionner dans l'état local.
      const saved = space
        ? await api.patch<Omit<VitrineSpace, "photos" | "pricingOptions">>(`/vitrine-spaces/${space.id}`, payload)
        : await api.post<Omit<VitrineSpace, "photos" | "pricingOptions">>("/vitrine-spaces", payload);

      onSaved({ photos: [], pricingOptions: [], ...saved });
      toast.success(space ? "Espace mis à jour." : "Espace créé.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{space ? "Modifier l'espace" : "Ajouter un espace"}</DialogTitle>
            <DialogDescription>
              Un espace correspond à un emplacement précis de votre vitrine (une taille d'affiche donnée).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="space-name">Nom de l'espace</Label>
              <Input
                id="space-name"
                required
                placeholder="Ex: Vitrine gauche"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="space-size">Taille</Label>
              <Select value={sizePreset} onValueChange={(v) => setSizePreset(v as PosterSizePreset)}>
                <SelectTrigger id="space-size" className="w-full">
                  <SelectValue>{(value: PosterSizePreset) => SIZE_LABELS[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PosterSizePreset).map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {SIZE_LABELS[preset]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sizePreset === PosterSizePreset.CUSTOM && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="space-custom-size">Description de la taille</Label>
                <Input
                  id="space-custom-size"
                  required
                  placeholder='Ex: 1,20m x 0,80m'
                  value={customSizeLabel}
                  onChange={(e) => setCustomSizeLabel(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="space-width">Largeur (cm, optionnel)</Label>
                <Input
                  id="space-width"
                  type="number"
                  min={1}
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="space-height">Hauteur (cm, optionnel)</Label>
                <Input
                  id="space-height"
                  type="number"
                  min={1}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="space-description">Description (optionnel)</Label>
              <Textarea
                id="space-description"
                rows={3}
                placeholder="Ex: emplacement bien visible depuis la rue principale"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {space ? "Enregistrer les modifications" : "Créer l'espace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SIZE_LABELS };
