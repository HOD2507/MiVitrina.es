import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { StripeModule } from "../stripe/stripe.module";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";

@Module({
  imports: [StorageModule, StripeModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
