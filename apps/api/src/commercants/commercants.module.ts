import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { StripeModule } from "../stripe/stripe.module";
import { CommercantsController } from "./commercants.controller";

@Module({
  imports: [StorageModule, StripeModule],
  controllers: [CommercantsController],
})
export class CommercantsModule {}
