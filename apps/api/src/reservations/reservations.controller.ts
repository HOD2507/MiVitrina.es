import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@mivitrina/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { ReservationsService } from "./reservations.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { RespondReservationDto } from "./dto/respond-reservation.dto";
import { ConfirmPhotoStepDto } from "./dto/confirm-photo-step.dto";
import { ConfirmPhotoDto } from "../commercants/dto/confirm-photo.dto";

@Controller("reservations")
export class ReservationsController {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly config: ConfigService,
  ) {}

  @Roles(UserRole.ANNONCEUR)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReservationDto) {
    return this.reservations.create(user.id, dto);
  }

  /** Démarre le paiement : renvoie l'URL d'une session Stripe Checkout hébergée. */
  @Roles(UserRole.ANNONCEUR)
  @Post(":id/checkout")
  createCheckout(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const webAppUrl = this.config.get<string>("WEB_APP_URL") ?? "http://localhost:3000";
    return this.reservations.createCheckoutSession(user.id, id, webAppUrl);
  }

  @Roles(UserRole.ANNONCEUR)
  @Post(":id/poster")
  confirmPoster(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ConfirmPhotoDto) {
    return this.reservations.confirmPoster(user.id, id, dto.key);
  }

  @Roles(UserRole.ANNONCEUR)
  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.reservations.cancel(user.id, id);
  }

  @Roles(UserRole.ANNONCEUR)
  @Get("me")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.reservations.listMine(user.id);
  }

  @Roles(UserRole.COMMERCANT)
  @Get("received")
  listReceived(@CurrentUser() user: AuthenticatedUser) {
    return this.reservations.listReceived(user.id);
  }

  @Roles(UserRole.COMMERCANT)
  @Patch(":id/respond")
  respond(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: RespondReservationDto) {
    return this.reservations.respond(user.id, id, dto);
  }

  /** Le commerçant déclare avoir posé l'affiche, preuve à l'appui. */
  @Roles(UserRole.COMMERCANT)
  @Post(":id/install-photo")
  uploadInstallPhoto(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ConfirmPhotoDto) {
    return this.reservations.uploadInstallPhoto(user.id, id, dto.key);
  }

  /** L'annonceur confirme (ou conteste) la pose. */
  @Roles(UserRole.ANNONCEUR)
  @Patch(":id/confirm-install")
  confirmInstall(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ConfirmPhotoStepDto) {
    return this.reservations.confirmInstall(user.id, id, dto);
  }

  /** Le commerçant déclare avoir retiré l'affiche, preuve à l'appui. */
  @Roles(UserRole.COMMERCANT)
  @Post(":id/removal-photo")
  uploadRemovalPhoto(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ConfirmPhotoDto) {
    return this.reservations.uploadRemovalPhoto(user.id, id, dto.key);
  }

  /** L'annonceur confirme (ou conteste) le retrait — clôture la réservation. */
  @Roles(UserRole.ANNONCEUR)
  @Patch(":id/confirm-removal")
  confirmRemoval(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ConfirmPhotoStepDto) {
    return this.reservations.confirmRemoval(user.id, id, dto);
  }
}
