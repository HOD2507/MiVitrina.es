import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { StripeModule } from "../stripe/stripe.module";
import { GeocodingModule } from "../geocoding/geocoding.module";
import { CommercantsController } from "./commercants.controller";

@Module({
  imports: [StorageModule, StripeModule, GeocodingModule],
  controllers: [CommercantsController],
})
export class CommercantsModule {}
