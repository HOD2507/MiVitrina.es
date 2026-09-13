import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { CommercantsController } from "./commercants.controller";

@Module({
  imports: [StorageModule],
  controllers: [CommercantsController],
})
export class CommercantsModule {}
