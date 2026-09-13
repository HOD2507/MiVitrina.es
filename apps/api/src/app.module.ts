import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    HealthModule,
    // Modules à venir : AuthModule, UsersModule, CommercantsModule,
    // AnnonceursModule, VitrineSpacesModule, ReservationsModule,
    // PaymentsModule, ChatModule, NotificationsModule, AdminModule...
  ],
})
export class AppModule {}
