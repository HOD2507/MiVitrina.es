import { Body, Controller, Post } from "@nestjs/common";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { StorageService } from "./storage.service";
import { PresignedUploadDto } from "./dto/presigned-upload.dto";

@Controller("storage")
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /**
   * Autorise un upload direct navigateur -> stockage pour l'utilisateur
   * authentifié courant. Le fichier ne transite jamais par l'API.
   */
  @Post("presigned-upload")
  async presignedUpload(@CurrentUser() user: AuthenticatedUser, @Body() dto: PresignedUploadDto) {
    return this.storage.createPresignedUpload(user.id, dto.purpose, dto.contentType);
  }
}
