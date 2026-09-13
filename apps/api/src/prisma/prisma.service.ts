import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@mivitrina/database";

/**
 * Enveloppe le PrismaClient généré dans un provider Nest, avec gestion
 * propre du cycle de vie (connexion/déconnexion avec l'application).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
