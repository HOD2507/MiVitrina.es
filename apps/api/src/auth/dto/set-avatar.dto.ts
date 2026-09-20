import { IsString, MaxLength, MinLength } from "class-validator";

/** Clé S3 renvoyée par POST /storage/presigned-upload (purpose = "avatar"). */
export class SetAvatarDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  key!: string;
}
