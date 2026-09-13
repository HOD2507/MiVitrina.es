import { Injectable, Logger } from "@nestjs/common";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/**
 * Géocodage via Nominatim (OpenStreetMap), gratuit et sans clé — voir
 * décision utilisateur du 2026-09-14 (pas de compte Google Maps pour
 * l'instant). L'architecture reste remplaçable : il suffit d'écrire un
 * autre service avec la même interface `geocode(address): Promise<...>`
 * pour basculer sur Google Maps Geocoding API plus tard.
 *
 * Politique d'usage Nominatim (https://operations.osmfoundation.org/policies/nominatim/) :
 * - User-Agent obligatoire identifiant l'application,
 * - 1 requête/seconde maximum sur le service public — on le respecte ici
 *   avec un verrou simple en mémoire (suffisant pour un seul processus API ;
 *   à revoir avec une vraie file d'attente si l'API tourne un jour sur
 *   plusieurs instances).
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private lastRequestAt = 0;
  private readonly minIntervalMs = 1100;

  async geocode(address: string): Promise<GeocodeResult | null> {
    await this.throttle();

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

  private async throttle() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastRequestAt = Date.now();
  }
}
