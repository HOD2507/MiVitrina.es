import { Module } from "@nestjs/common";
import { StripeModule } from "../stripe/stripe.module";
import { ReservationsModule } from "../reservations/reservations.module";
import { WebhooksController } from "./webhooks.controller";

@Module({
  imports: [StripeModule, ReservationsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
