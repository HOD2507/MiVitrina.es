import { Module } from "@nestjs/common";
import { AnnonceursController } from "./annonceurs.controller";

@Module({
  controllers: [AnnonceursController],
})
export class AnnonceursModule {}
