import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@mivitrina/database";
import { ReservationStatus, VerificationStatus } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

/** Statuts qui bloquent réellement le créneau d'un espace — même liste que ReservationsService. */
const BLOCKING_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING_VALIDATION,
  ReservationStatus.CONFIRMED,
  ReservationStatus.ACTIVE,
];

interface NearbyRow {
  id: string;
  businessName: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Recherche par rayon autour d'un point (lat/lng), distance calculée en
   * SQL avec la formule de Haversine (pas de PostGIS au MVP — largement
   * suffisant pour le volume attendu). Les commerces sont d'abord filtrés
   * par une box englobante grossière via l'index (latitude, longitude)
   * pour éviter de calculer `acos` sur toute la table, puis affinés par
   * la vraie distance dans la sous-requête externe.
   *
   * `LEAST`/`GREATEST` protègent `acos` d'un argument théoriquement hors
   * de [-1, 1] à cause des imprécisions flottantes (deux points quasi
   * identiques peuvent produire 1.0000000000000002).
   */
  async search(lat: number, lng: number, radiusKm: number) {
    // ~1° de latitude ≈ 111 km ; on élargit la box de recherche pour ne
    // jamais exclure un point à la limite du rayon avant le calcul exact.
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

    const rows = await this.prisma.$queryRaw<NearbyRow[]>(Prisma.sql`
      SELECT * FROM (
        SELECT
          cp.id,
          cp."businessName",
          cp.city,
          cp."postalCode",
          cp.latitude,
          cp.longitude,
          (6371 * acos(
            LEAST(1, GREATEST(-1,
              cos(radians(${lat})) * cos(radians(cp.latitude)) * cos(radians(cp.longitude) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(cp.latitude))
            ))
          )) AS "distanceKm"
        FROM commercant_profiles cp
        WHERE cp."verificationStatus" = ${VerificationStatus.VERIFIED}::"VerificationStatus"
          AND cp.latitude BETWEEN ${lat - latDelta} AND ${lat + latDelta}
          AND cp.longitude BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
      ) sub
      WHERE "distanceKm" <= ${radiusKm}
      ORDER BY "distanceKm" ASC
      LIMIT 50
    `);

    if (rows.length === 0) return [];

    const profileIds = rows.map((r) => r.id);

    const [spaces, showcasePhotos] = await Promise.all([
      this.prisma.vitrineSpace.findMany({
        where: { commercantProfileId: { in: profileIds }, isActive: true },
        include: {
          pricingOptions: { where: { isActive: true } },
          photos: { orderBy: { position: "asc" }, take: 1 },
        },
      }),
      this.prisma.showcasePhoto.findMany({
        where: { commercantProfileId: { in: profileIds } },
        orderBy: { position: "asc" },
      }),
    ]);

    const firstShowcasePhotoByProfile = new Map<string, string>();
    for (const photo of showcasePhotos) {
      if (!firstShowcasePhotoByProfile.has(photo.commercantProfileId)) {
        firstShowcasePhotoByProfile.set(photo.commercantProfileId, photo.url);
      }
    }

    const spacesByProfile = new Map<string, typeof spaces>();
    for (const space of spaces) {
      const list = spacesByProfile.get(space.commercantProfileId) ?? [];
      list.push(space);
      spacesByProfile.set(space.commercantProfileId, list);
    }

    return Promise.all(
      rows.map(async (row) => {
        const profileSpaces = spacesByProfile.get(row.id) ?? [];
        const prices = profileSpaces.flatMap((s) => s.pricingOptions.map((p) => Number(p.price)));
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;

        const thumbnailKey =
          profileSpaces.find((s) => s.photos.length > 0)?.photos[0]?.url ?? firstShowcasePhotoByProfile.get(row.id);

        return {
          id: row.id,
          businessName: row.businessName,
          city: row.city,
          postalCode: row.postalCode,
          latitude: row.latitude,
          longitude: row.longitude,
          distanceKm: Math.round(row.distanceKm * 10) / 10,
          spaceCount: profileSpaces.length,
          minPrice,
          thumbnailUrl: thumbnailKey
            ? await this.storage.getPresignedReadUrl(this.storage.getKeyFromFileUrl(thumbnailKey), 3600)
            : null,
        };
      }),
    );
  }

  /** Fiche publique d'un commerce vérifié, avec tous ses espaces actifs. */
  async getPublicProfile(id: string) {
    const profile = await this.prisma.commercantProfile.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { position: "asc" } },
        spaces: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          include: {
            photos: { orderBy: { position: "asc" } },
            pricingOptions: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!profile || profile.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new NotFoundException("Commerce introuvable.");
    }

    const [showcasePhotos, spaces] = await Promise.all([
      Promise.all(
        profile.photos.map(async (photo) => ({
          id: photo.id,
          url: await this.storage.getPresignedReadUrl(this.storage.getKeyFromFileUrl(photo.url), 3600),
        })),
      ),
      Promise.all(
        profile.spaces.map(async (space) => ({
          ...space,
          photos: await Promise.all(
            space.photos.map(async (photo) => ({
              id: photo.id,
              url: await this.storage.getPresignedReadUrl(this.storage.getKeyFromFileUrl(photo.url), 3600),
            })),
          ),
        })),
      ),
    ]);

    return {
      id: profile.id,
      businessName: profile.businessName,
      description: profile.description,
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      city: profile.city,
      postalCode: profile.postalCode,
      country: profile.country,
      latitude: profile.latitude,
      longitude: profile.longitude,
      showcasePhotos,
      spaces,
    };
  }

  /**
   * Périodes déjà occupées pour un espace — sert uniquement à guider
   * visuellement l'annonceur dans le calendrier de réservation (dates
   * grisées/rouges). La vérification qui compte réellement reste celle
   * de ReservationsService.create au moment de la réservation : ceci
   * n'est qu'un affichage indicatif, pas une garantie contre une course
   * entre deux annonceurs.
   */
  async getSpaceAvailability(spaceId: string) {
    const space = await this.prisma.vitrineSpace.findUnique({ where: { id: spaceId } });
    if (!space) {
      throw new NotFoundException("Espace introuvable.");
    }

    const reservations = await this.prisma.reservation.findMany({
      where: { spaceId, status: { in: BLOCKING_STATUSES } },
      select: { startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    });

    return reservations.map((r) => ({ startDate: r.startDate, endDate: r.endDate }));
  }
}
