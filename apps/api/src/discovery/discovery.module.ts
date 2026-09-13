import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { GeocodingModule } from "../geocoding/geocoding.module";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";

@Module({
  imports: [StorageModule, GeocodingModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
