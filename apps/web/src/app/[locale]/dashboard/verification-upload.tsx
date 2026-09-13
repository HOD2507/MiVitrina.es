"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2 } from "lucide-react";

interface PresignedUploadResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function VerificationUpload() {
  const t = useTranslations("Dashboard.verification");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setStatus("error");
      setError(t("invalidType"));
      return;
    }

    setStatus("uploading");
    setError(null);

    try {
      // 1. Demande une autorisation d'upload direct vers le stockage.
      const presigned = await api.post<PresignedUploadResponse>("/storage/presigned-upload", {
        purpose: "verification-document",
        contentType: file.type,
      });

      // 2. Upload direct navigateur -> stockage (le fichier ne passe pas par notre API).
      const formData = new FormData();
      Object.entries(presigned.fields).forEach(([key, value]) => formData.append(key, value));
      formData.append("file", file);

      const uploadRes = await fetch(presigned.url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        throw new Error("upload-failed");
      }

      // 3. Confirme à l'API que le fichier est bien arrivé, pour l'associer au profil.
      await api.patch("/commercants/me/verification-document", { key: presigned.key });
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : t("genericError"));
      return;
    }

    setStatus("success");
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="mb-1 text-sm font-medium">{t("title")}</p>
      <p className="mb-3 text-xs text-muted-foreground">{t("hint")}</p>
      <Input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        disabled={status === "uploading"}
      />
      {status === "uploading" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {t("uploading")}
        </p>
      )}
      {status === "success" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle2 className="size-3.5" />
          {t("success")}
        </p>
      )}
      {status === "error" && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
