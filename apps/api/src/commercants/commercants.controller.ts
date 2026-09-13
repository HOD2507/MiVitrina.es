import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService, UploadPurpose } from "../storage/storage.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { UpdateVerificationDocumentDto } from "./dto/update-verification-document.dto";
import { UpdateCommercantProfileDto } from "./dto/update-commercant-profile.dto";
import { ConfirmPhotoDto } from "./dto/confirm-photo.dto";

@Controller("commercants")
@Roles(UserRole.COMMERCANT)
export class CommercantsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Données complètes de la page "Ma vitrine" : profil, photos générales
   * et espaces (avec leurs tarifs et photos). Toutes les photos sont
   * renvoyées en URL de lecture signée (bucket privé au MVP — voir
   * docs/ARCHITECTURE.md, ça deviendra public quand la recherche
   * annonceur sera construite).
   */
  @Get("me/vitrine")
  async getMyVitrine(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.commercantProfile.findUnique({
      where: { userId: user.id },
      include: {
        photos: { orderBy: { position: "asc" } },
        spaces: {
          orderBy: { createdAt: "asc" },
          include: {
            photos: { orderBy: { position: "asc" } },
            pricingOptions: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException("Profil commerçant introuvable.");
    }

    const [showcasePhotos, spaces] = await Promise.all([
      Promise.all(
        profile.photos.map(async (photo) => ({
          id: photo.id,
          url: await this.storage.getPresignedReadUrl(this.storage.getKeyFromFileUrl(photo.url), 3600),
        })),
      ),
      Promise.all(
        profile.spaces.map(async (space) => ({
          ...space,
          photos: await Promise.all(
            space.photos.map(async (photo) => ({
              id: photo.id,
              url: await this.storage.getPresignedReadUrl(this.storage.getKeyFromFileUrl(photo.url), 3600),
            })),
          ),
        })),
      ),
    ]);

    return {
      profile: {
        id: profile.id,
        businessName: profile.businessName,
        description: profile.description,
        city: profile.city,
        postalCode: profile.postalCode,
        verificationStatus: profile.verificationStatus,
      },
      showcasePhotos,
      spaces,
    };
  }

  @Patch("me")
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCommercantProfileDto) {
    return this.prisma.commercantProfile.update({
      where: { userId: user.id },
      data: { description: dto.description },
    });
  }

  @Post("me/showcase-photos")
  async addShowcasePhoto(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmPhotoDto) {
    if (!dto.key.startsWith(`${UploadPurpose.SHOWCASE_PHOTO}/${user.id}/`)) {
      throw new ForbiddenException("Cette photo ne vous appartient pas.");
    }
    const profile = await this.prisma.commercantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      throw new BadRequestException("Profil commerçant introuvable.");
    }

    const count = await this.prisma.showcasePhoto.count({ where: { commercantProfileId: profile.id } });
    return this.prisma.showcasePhoto.create({
      data: { commercantProfileId: profile.id, url: this.storage.getFileUrl(dto.key), position: count },
    });
  }

  @Delete("me/showcase-photos/:id")
  async removeShowcasePhoto(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const photo = await this.prisma.showcasePhoto.findUnique({
      where: { id },
      include: { commercantProfile: true },
    });
    if (!photo || photo.commercantProfile.userId !== user.id) {
      throw new NotFoundException("Photo introuvable.");
    }
    await this.prisma.showcasePhoto.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Enregistre le justificatif d'identité uploadé (SIRET/NIF-CIF) après un
   * POST /storage/presigned-upload réussi. Repasse le statut à PENDING :
   * ce endpoint sert aussi bien au premier envoi qu'à un nouvel envoi
   * après un rejet par l'admin.
   */
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
