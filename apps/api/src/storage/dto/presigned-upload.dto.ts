import { IsEnum, IsString } from "class-validator";
import { UploadPurpose } from "../storage.service";

export class PresignedUploadDto {
  @IsEnum(UploadPurpose)
  purpose!: UploadPurpose;

  @IsString()
  contentType!: string;
}
