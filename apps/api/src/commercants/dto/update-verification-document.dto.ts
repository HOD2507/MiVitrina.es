import { IsString, Matches } from "class-validator";

export class UpdateVerificationDocumentDto {
  /** Clé S3 renvoyée par POST /storage/presigned-upload (purpose=verification-document). */
  @IsString()
  @Matches(/^verification-document\//, { message: "Clé invalide pour ce type de document." })
  key!: string;
}
