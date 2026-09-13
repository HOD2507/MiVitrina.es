import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { VitrineSpacesController } from "./vitrine-spaces.controller";

@Module({
  imports: [StorageModule],
  controllers: [VitrineSpacesController],
})
export class VitrineSpacesModule {}
