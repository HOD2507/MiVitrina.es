"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { uploadPhoto } from "@/lib/upload-photo";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Foto de perfil. Se ve enseguida, sin revisión previa del admin: la
 * otra parte de una reserva (p. ej. el comerciante que recibe una
 * solicitud) la ve en la tarjeta de la solicitud.
 */
export function AvatarUploader({ user, displayName }: { user: AuthUser; displayName: string }) {
  const t = useTranslations("Ajustes");
  const tErrors = useTranslations("Auth.errors");
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error(t("avatarTooLarge"));
      return;
    }
    setBusy(true);
    try {
      const { key } = await uploadPhoto(file, "avatar");
      const updated = await api.post<AuthUser>("/auth/me/avatar", { key });
      setAvatarUrl(updated.avatarUrl);
      toast.success(t("avatarSaved"));
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : tErrors("generic"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await api.delete("/auth/me/avatar");
      setAvatarUrl(null);
      toast.success(t("avatarRemoved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar src={avatarUrl} name={displayName} size="lg" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {avatarUrl ? t("avatarChange") : t("avatarUpload")}
          </Button>
          {avatarUrl && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={handleRemove}>
              <Trash2 className="size-3.5" />
              {t("avatarRemove")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={t("avatarUpload")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
