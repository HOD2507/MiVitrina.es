import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@mivitrina/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { ReservationsService } from "./reservations.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { RespondReservationDto } from "./dto/respond-reservation.dto";
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
}
