import { IsString } from "class-validator";

/** Confirme un fichier déjà uploadé via POST /storage/presigned-upload. */
export class ConfirmPhotoDto {
  @IsString()
  key!: string;
}
