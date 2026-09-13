import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { CommercantsModule } from "./commercants/commercants.module";
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
    HealthModule,
    // Modules à venir : UsersModule (admin), AnnonceursModule,
    // VitrineSpacesModule, ReservationsModule, PaymentsModule, ChatModule,
    // NotificationsModule, AdminModule...
  ],
})
export class AppModule {}
