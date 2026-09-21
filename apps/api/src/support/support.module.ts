import { Module } from "@nestjs/common";
import { SupportController } from "./support.controller";
import { SupportAdminController } from "./support-admin.controller";
import { SupportService } from "./support.service";
import { SupportAdminService } from "./support-admin.service";

@Module({
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService, SupportAdminService],
})
export class SupportModule {}
