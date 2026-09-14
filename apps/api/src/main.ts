import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody: true expose request.rawBody (Buffer), nécessaire pour vérifier
  // la signature des webhooks Stripe (stripe.webhooks.constructEvent) —
  // le body doit être lu tel quel, avant tout parsing JSON.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.WEB_APP_URL ?? "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix("api");

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}/api`);
}

bootstrap();
