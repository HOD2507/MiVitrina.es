import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Country } from "@mivitrina/shared";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/** Nom complet du pays, plus fiable que le code ISO pour le géocodage. */
const COUNTRY_NAME_FOR_GEOCODING: Record<Country, string> = {
  [Country.FR]: "France",
  [Country.ES]: "España",
};

/** Adresse complète à passer à `geocode()`, construite de façon identique
 * à l'inscription et à la mise à jour du profil commerçant. */
export function buildGeocodingAddress(
  addressLine1: string,
  postalCode: string,
  city: string,
  country: Country,
): string {
  return [addressLine1, postalCode, city, COUNTRY_NAME_FOR_GEOCODING[country]].filter(Boolean).join(", ");
}

/**
 * Géocodage des adresses commerçant, avec bascule automatique selon la
 * configuration :
 * - `GOOGLE_MAPS_API_KEY` définie -> Google Geocoding API (payant au-delà
 *   du crédit gratuit mensuel de Google, mais plus précis/fiable en
 *   volume — demande explicite de l'utilisateur, conscient du coût).
 * - sinon -> Nominatim (OpenStreetMap), gratuit et sans clé, décision
 *   précédente tant qu'aucun compte Google Cloud n'était disponible.
 *
 * Les deux implémentent la même interface `geocode(address): Promise<...>` :
 * le reste de l'application (AuthService, DiscoveryController) ne sait pas
 * laquelle est active.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly googleApiKey?: string;
  private lastNominatimRequestAt = 0;
  private readonly minNominatimIntervalMs = 1100;

  constructor(private readonly config: ConfigService) {
    this.googleApiKey = this.config.get<string>("GOOGLE_MAPS_API_KEY") || undefined;
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    if (this.googleApiKey) {
      return this.geocodeWithGoogle(address, this.googleApiKey);
    }
    return this.geocodeWithNominatim(address);
  }

  private async geocodeWithGoogle(address: string, apiKey: string): Promise<GeocodeResult | null> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.warn(`Géocodage Google échoué (HTTP ${res.status}) pour "${address}"`);
        return null;
      }

      const body = (await res.json()) as {
        status: string;
        results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      };

      if (body.status !== "OK" || body.results.length === 0) {
        // ZERO_RESULTS = adresse introuvable ; REQUEST_DENIED/OVER_QUERY_LIMIT
        // = clé invalide ou facturation non configurée côté Google Cloud.
        this.logger.warn(`Géocodage Google : statut "${body.status}" pour "${address}"`);
        return null;
      }

      const { lat, lng } = body.results[0].geometry.location;
      return { latitude: lat, longitude: lng };
    } catch (err) {
      this.logger.error(`Erreur de géocodage Google pour "${address}"`, err instanceof Error ? err.stack : err);
      return null;
    }
  }

  /**
   * Politique d'usage Nominatim (https://operations.osmfoundation.org/policies/nominatim/) :
   * - User-Agent obligatoire identifiant l'application,
   * - 1 requête/seconde maximum sur le service public — on le respecte ici
   *   avec un verrou simple en mémoire (suffisant pour un seul processus API ;
   *   à revoir avec une vraie file d'attente si l'API tourne un jour sur
   *   plusieurs instances).
   */
  private async geocodeWithNominatim(address: string): Promise<GeocodeResult | null> {
    await this.throttleNominatim();

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "MiVitrina/1.0 (contact@mivitrina.es)" },
      });

      if (!res.ok) {
        this.logger.warn(`Géocodage échoué (HTTP ${res.status}) pour "${address}"`);
        return null;
      }

      const results = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (results.length === 0) {
        this.logger.warn(`Aucun résultat de géocodage pour "${address}"`);
        return null;
      }

      return { latitude: parseFloat(results[0].lat), longitude: parseFloat(results[0].lon) };
    } catch (err) {
      // Le géocodage ne doit jamais faire échouer l'inscription : le
      // commerce reste simplement invisible dans la recherche tant que
      // ses coordonnées ne sont pas connues.
      this.logger.error(`Erreur de géocodage pour "${address}"`, err instanceof Error ? err.stack : err);
      return null;
    }
  }

  private async throttleNominatim() {
    const elapsed = Date.now() - this.lastNominatimRequestAt;
    if (elapsed < this.minNominatimIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minNominatimIntervalMs - elapsed));
    }
    this.lastNominatimRequestAt = Date.now();
  }
}
