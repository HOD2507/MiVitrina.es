import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { CommercantsModule } from "./commercants/commercants.module";
import { VitrineSpacesModule } from "./vitrine-spaces/vitrine-spaces.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { ReservationsModule } from "./reservations/reservations.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { ChatModule } from "./chat/chat.module";
import { AdminModule } from "./admin/admin.module";
import { envValidationSchema } from "./config/env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    StorageModule,
    CommercantsModule,
    VitrineSpacesModule,
    DiscoveryModule,
    ReservationsModule,
    WebhooksModule,
    ChatModule,
    AdminModule,
    HealthModule,
    // Modules à venir : UsersModule (admin), AnnonceursModule,
    // PaymentsModule, ChatModule, NotificationsModule, AdminModule...
  ],
})
export class AppModule {}
