import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Patch } from "@nestjs/common";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { UpdateVerificationDocumentDto } from "./dto/update-verification-document.dto";

@Controller("commercants")
export class CommercantsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Enregistre le justificatif d'identité uploadé (SIRET/NIF-CIF) après un
   * POST /storage/presigned-upload réussi. Repasse le statut à PENDING :
   * ce endpoint sert aussi bien au premier envoi qu'à un nouvel envoi
   * après un rejet par l'admin.
   */
  @Roles(UserRole.COMMERCANT)
  @Patch("me/verification-document")
  async updateVerificationDocument(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVerificationDocumentDto) {
    // La clé doit appartenir à cet utilisateur (préfixe posé par StorageService) :
    // on ne fait jamais confiance à une URL/clé fournie par le client sans ce contrôle.
    if (!dto.key.startsWith(`verification-document/${user.id}/`)) {
      throw new ForbiddenException("Ce document ne vous appartient pas.");
    }

    const profile = await this.prisma.commercantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      throw new BadRequestException("Profil commerçant introuvable.");
    }

    return this.prisma.commercantProfile.update({
      where: { userId: user.id },
      data: {
        verificationDocumentUrl: this.storage.getFileUrl(dto.key),
        verificationStatus: VerificationStatus.PENDING,
        verificationNote: null,
      },
    });
  }

  /**
   * URL de lecture signée (5 min) vers le justificatif déjà envoyé, pour
   * que le commerçant puisse relire ce qu'il a soumis. Le bucket étant
   * privé, `verificationDocumentUrl` seul ne suffit pas à l'afficher.
   */
  @Roles(UserRole.COMMERCANT)
  @Get("me/verification-document")
  async getVerificationDocumentUrl(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.commercantProfile.findUnique({ where: { userId: user.id } });
    if (!profile?.verificationDocumentUrl) {
      throw new NotFoundException("Aucun justificatif envoyé pour le moment.");
    }

    const key = this.storage.getKeyFromFileUrl(profile.verificationDocumentUrl);
    return { readUrl: await this.storage.getPresignedReadUrl(key) };
  }
}
