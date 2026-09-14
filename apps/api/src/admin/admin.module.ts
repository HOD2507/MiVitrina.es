import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { StripeModule } from "../stripe/stripe.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [StorageModule, StripeModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
