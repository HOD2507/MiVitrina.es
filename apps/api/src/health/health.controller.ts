import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";

@Controller("health")
export class HealthController {
  /** Endpoint de vérification simple, utilisé par docker-compose / monitoring. */
  @Public()
  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
