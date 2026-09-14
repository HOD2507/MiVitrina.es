import { api } from "./api-client";

interface PresignedUploadResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload direct navigateur -> stockage (le fichier ne passe pas par notre
 * API) pour une photo (vitrine, espace ou affiche). Retourne la clé S3 à
 * confirmer ensuite auprès du bon endpoint (POST .../photos ou .../poster).
 */
export async function uploadPhoto(
  file: File,
  purpose: "showcase-photo" | "space-photo" | "poster" | "install-photo" | "removal-photo",
): Promise<{ key: string }> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Format non supporté (JPG, PNG ou WEBP uniquement).");
  }

  const presigned = await api.post<PresignedUploadResponse>("/storage/presigned-upload", {
    purpose,
    contentType: file.type,
  });

  const formData = new FormData();
  Object.entries(presigned.fields).forEach(([key, value]) => formData.append(key, value));
  formData.append("file", file);

  const uploadRes = await fetch(presigned.url, { method: "POST", body: formData });
  if (!uploadRes.ok) {
    throw new Error("L'envoi du fichier a échoué.");
  }

  return { key: presigned.key };
}
