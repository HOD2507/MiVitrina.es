import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  /** Endpoint de vérification simple, utilisé par docker-compose / monitoring. */
  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
