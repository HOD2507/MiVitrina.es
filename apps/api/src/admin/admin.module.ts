import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { StripeModule } from "../stripe/stripe.module";
import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  // AuthModule : nécessaire pour AuthUserCacheService (invalidation
  // immédiate du cache après suspension/suppression/changement de niveau
  // d'un admin — voir AdminService).
  imports: [StorageModule, StripeModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
