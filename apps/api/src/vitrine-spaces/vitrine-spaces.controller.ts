import {
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
import { UserRole } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService, UploadPurpose } from "../storage/storage.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { ConfirmPhotoDto } from "../commercants/dto/confirm-photo.dto";
import { CreateSpaceDto } from "./dto/create-space.dto";
import { UpdateSpaceDto } from "./dto/update-space.dto";
import { CreatePricingOptionDto } from "./dto/create-pricing-option.dto";
import { UpdatePricingOptionDto } from "./dto/update-pricing-option.dto";

/**
 * Toutes les routes vérifient que l'espace (ou l'option tarifaire, ou la
 * photo) appartient bien au commerçant authentifié avant toute lecture/
 * écriture — jamais de confiance dans un :id fourni par le client seul.
 */
@Controller("vitrine-spaces")
@Roles(UserRole.COMMERCANT)
export class VitrineSpacesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async getOwnProfileOrThrow(userId: string) {
    const profile = await this.prisma.commercantProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException("Profil commerçant introuvable.");
    }
    return profile;
  }

  /** Charge un espace en vérifiant qu'il appartient au commerçant courant. */
  private async getOwnSpaceOrThrow(userId: string, spaceId: string) {
    const space = await this.prisma.vitrineSpace.findUnique({
      where: { id: spaceId },
      include: { commercantProfile: true },
    });
    if (!space || space.commercantProfile.userId !== userId) {
      throw new NotFoundException("Espace introuvable.");
    }
    return space;
  }

  @Get("me")
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.getOwnProfileOrThrow(user.id);
    return this.prisma.vitrineSpace.findMany({
      where: { commercantProfileId: profile.id },
      orderBy: { createdAt: "asc" },
      include: { photos: { orderBy: { position: "asc" } }, pricingOptions: { orderBy: { createdAt: "asc" } } },
    });
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSpaceDto) {
    const profile = await this.getOwnProfileOrThrow(user.id);
    return this.prisma.vitrineSpace.create({
      data: {
        commercantProfileId: profile.id,
        name: dto.name,
        sizePreset: dto.sizePreset,
        customSizeLabel: dto.customSizeLabel,
        widthCm: dto.widthCm,
        heightCm: dto.heightCm,
        description: dto.description,
      },
    });
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateSpaceDto) {
    await this.getOwnSpaceOrThrow(user.id, id);
    return this.prisma.vitrineSpace.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.getOwnSpaceOrThrow(user.id, id);
    await this.prisma.vitrineSpace.delete({ where: { id } });
    return { ok: true };
  }

  @Post(":id/photos")
  async addPhoto(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ConfirmPhotoDto) {
    await this.getOwnSpaceOrThrow(user.id, id);
    if (!dto.key.startsWith(`${UploadPurpose.SPACE_PHOTO}/${user.id}/`)) {
      throw new ForbiddenException("Cette photo ne vous appartient pas.");
    }
    const count = await this.prisma.spacePhoto.count({ where: { spaceId: id } });
    return this.prisma.spacePhoto.create({
      data: { spaceId: id, url: this.storage.getFileUrl(dto.key), position: count },
    });
  }

  @Delete(":id/photos/:photoId")
  async removePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("photoId") photoId: string,
  ) {
    await this.getOwnSpaceOrThrow(user.id, id);
    const photo = await this.prisma.spacePhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.spaceId !== id) {
      throw new NotFoundException("Photo introuvable.");
    }
    await this.prisma.spacePhoto.delete({ where: { id: photoId } });
    return { ok: true };
  }

  @Post(":id/pricing-options")
  async addPricingOption(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreatePricingOptionDto,
  ) {
    await this.getOwnSpaceOrThrow(user.id, id);
    return this.prisma.pricingOption.create({
      data: {
        spaceId: id,
        durationType: dto.durationType,
        price: dto.price,
        minDurationDays: dto.minDurationDays,
      },
    });
  }

  @Patch(":id/pricing-options/:pricingOptionId")
  async updatePricingOption(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("pricingOptionId") pricingOptionId: string,
    @Body() dto: UpdatePricingOptionDto,
  ) {
    await this.getOwnSpaceOrThrow(user.id, id);
    const pricingOption = await this.prisma.pricingOption.findUnique({ where: { id: pricingOptionId } });
    if (!pricingOption || pricingOption.spaceId !== id) {
      throw new NotFoundException("Tarif introuvable.");
    }
    return this.prisma.pricingOption.update({ where: { id: pricingOptionId }, data: dto });
  }

  @Delete(":id/pricing-options/:pricingOptionId")
  async removePricingOption(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("pricingOptionId") pricingOptionId: string,
  ) {
    await this.getOwnSpaceOrThrow(user.id, id);
    const pricingOption = await this.prisma.pricingOption.findUnique({ where: { id: pricingOptionId } });
    if (!pricingOption || pricingOption.spaceId !== id) {
      throw new NotFoundException("Tarif introuvable.");
    }
    await this.prisma.pricingOption.delete({ where: { id: pricingOptionId } });
    return { ok: true };
  }
}
