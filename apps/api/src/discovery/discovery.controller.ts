import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { DiscoveryService } from "./discovery.service";
import { SearchQueryDto } from "./dto/search-query.dto";
import { GeocodeQueryDto } from "./dto/geocode-query.dto";
import { GeocodingService } from "../geocoding/geocoding.service";

/**
 * Endpoints de découverte publics — accessibles sans compte, y compris
 * pour un visiteur non connecté qui explore avant de s'inscrire.
 */
@Controller("discovery")
export class DiscoveryController {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly geocoding: GeocodingService,
  ) {}

  @Public()
  @Get("search")
  async search(@Query() query: SearchQueryDto) {
    return this.discovery.search(query.lat, query.lng, query.radiusKm ?? 10);
  }

  /** Géocode une ville/adresse saisie manuellement (recherche par lieu, sans géolocalisation navigateur). */
  @Public()
  @Get("geocode")
  async geocode(@Query() query: GeocodeQueryDto) {
    const result = await this.geocoding.geocode(query.q);
    if (!result) {
      throw new NotFoundException("Adresse introuvable.");
    }
    return result;
  }

  @Public()
  @Get("commercants/:id")
  async getCommercant(@Param("id") id: string) {
    return this.discovery.getPublicProfile(id);
  }

  /** Périodes déjà occupées pour un espace — affichage indicatif dans le calendrier de réservation. */
  @Public()
  @Get("spaces/:id/availability")
  async getSpaceAvailability(@Param("id") id: string) {
    return this.discovery.getSpaceAvailability(id);
  }
}
