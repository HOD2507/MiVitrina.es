import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

/**
 * Contexte d'upload : détermine le préfixe de clé S3, les types MIME
 * acceptés et la taille max. Ajouter un cas ici pour chaque nouveau type
 * de fichier (photos vitrine, affiche à valider...).
 */
export enum UploadPurpose {
  VERIFICATION_DOCUMENT = "verification-document",
  SHOWCASE_PHOTO = "showcase-photo",
  SPACE_PHOTO = "space-photo",
  POSTER = "poster",
  INSTALL_PHOTO = "install-photo",
  REMOVAL_PHOTO = "removal-photo",
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PURPOSE_RULES: Record<UploadPurpose, { allowedContentTypes: string[]; maxSizeBytes: number }> = {
  [UploadPurpose.VERIFICATION_DOCUMENT]: {
    allowedContentTypes: [...IMAGE_TYPES, "application/pdf"],
    maxSizeBytes: 10 * 1024 * 1024, // 10 Mo
  },
  [UploadPurpose.SHOWCASE_PHOTO]: { allowedContentTypes: IMAGE_TYPES, maxSizeBytes: 8 * 1024 * 1024 },
  [UploadPurpose.SPACE_PHOTO]: { allowedContentTypes: IMAGE_TYPES, maxSizeBytes: 8 * 1024 * 1024 },
  [UploadPurpose.POSTER]: { allowedContentTypes: IMAGE_TYPES, maxSizeBytes: 15 * 1024 * 1024 },
  [UploadPurpose.INSTALL_PHOTO]: { allowedContentTypes: IMAGE_TYPES, maxSizeBytes: 8 * 1024 * 1024 },
  [UploadPurpose.REMOVAL_PHOTO]: { allowedContentTypes: IMAGE_TYPES, maxSizeBytes: 8 * 1024 * 1024 },
};

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface PresignedUpload {
  /** URL de destination du POST multipart (voir `fields`). */
  url: string;
  /** Champs à inclure dans le FormData, avant le champ "file". */
  fields: Record<string, string>;
  /**
   * Localisateur de la ressource une fois l'upload terminé — PAS une URL
   * lisible directement par un navigateur : le bucket est privé par
   * défaut (indispensable pour un justificatif d'identité). Pour
   * afficher le fichier, générer une URL de lecture à durée limitée via
   * `getPresignedReadUrl(key)`. Les photos vraiment publiques (vitrine,
   * espaces) auront une politique d'accès dédiée à l'étape "Ma vitrine".
   */
  fileUrl: string;
  key: string;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly publicUrlBase: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.config.get<string>("S3_ENDPOINT")!;
    this.bucket = this.config.get<string>("S3_BUCKET")!;
    this.publicUrlBase = this.config.get<string>("S3_PUBLIC_URL_BASE") || `${this.endpoint}/${this.bucket}`;

    this.client = new S3Client({
      region: this.config.get<string>("S3_REGION"),
      endpoint: this.endpoint,
      forcePathStyle: this.config.get<boolean>("S3_FORCE_PATH_STYLE"),
      credentials: {
        accessKeyId: this.config.get<string>("S3_ACCESS_KEY_ID")!,
        secretAccessKey: this.config.get<string>("S3_SECRET_ACCESS_KEY")!,
      },
    });
  }

  /**
   * Génère une autorisation d'upload direct navigateur -> S3/MinIO (POST
   * multipart présigné), sans faire transiter le fichier par l'API.
   * La taille max est appliquée par S3/MinIO lui-même via la condition
   * "content-length-range", pas seulement côté client.
   */
  async createPresignedUpload(userId: string, purpose: UploadPurpose, contentType: string): Promise<PresignedUpload> {
    const rules = PURPOSE_RULES[purpose];
    if (!rules) {
      throw new BadRequestException("Type d'upload inconnu.");
    }
    if (!rules.allowedContentTypes.includes(contentType)) {
      throw new BadRequestException(
        `Type de fichier non autorisé pour "${purpose}". Types acceptés : ${rules.allowedContentTypes.join(", ")}.`,
      );
    }

    const extension = EXTENSION_BY_CONTENT_TYPE[contentType] ?? "bin";
    const key = `${purpose}/${userId}/${randomUUID()}.${extension}`;

    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ["content-length-range", 1, rules.maxSizeBytes],
        ["eq", "$Content-Type", contentType],
      ],
      Fields: { "Content-Type": contentType },
      Expires: 300, // 5 minutes pour compléter l'upload
    });

    return { url, fields, fileUrl: this.getFileUrl(key), key };
  }

  /** Reconstruit le localisateur de ressource à partir d'une clé S3 déjà connue et validée. */
  getFileUrl(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }

  /** Inverse de `getFileUrl` : retrouve la clé S3 à partir d'un localisateur stocké en base. */
  getKeyFromFileUrl(fileUrl: string): string {
    return fileUrl.replace(`${this.publicUrlBase}/`, "");
  }

  /**
   * Génère une URL de lecture signée, valable `expiresInSeconds` (5 min
   * par défaut). Seul moyen légitime de lire un fichier dans le bucket
   * privé — à utiliser chaque fois qu'un justificatif ou une photo doit
   * être affiché(e), jamais en stockant l'URL signée elle-même.
   */
  async getPresignedReadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
