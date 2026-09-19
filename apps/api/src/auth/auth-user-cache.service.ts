import { Injectable } from "@nestjs/common";
import type { User } from "@mivitrina/database";

interface CacheEntry {
  user: User;
  expiresAt: number;
}

/**
 * Cache mémoire process (TTL court) du lookup User fait par
 * JwtAccessStrategy.validate() — exécuté sur QUASIMENT chaque requête
 * authentifiée (guard global JwtAuthGuard), donc chaque navigation dans
 * le panel déclenchait plusieurs allers-retours DB rien que pour l'auth,
 * avant même de charger les données de la page. Retour utilisateur
 * explicite : la lenteur persistait sur des pages déjà visitées (donc pas
 * un problème de compilation Next.js) — confirmé venir de cette requête
 * DB répétée.
 *
 * Compromis explicitement validé par l'utilisateur : jusqu'à TTL_MS de
 * délai avant qu'un changement de statut/permission ne prenne effet — SAUF
 * pour les actions faites depuis le panel admin lui-même (suspendre,
 * supprimer, changer le niveau d'un admin...), où le service appelant
 * invalide l'entrée immédiatement via `invalidate()` : ces cas-là restent
 * instantanés, seul le résidu (modification hors panel, ex. directement en
 * base) profite du délai — jamais plus de TTL_MS dans le pire cas.
 *
 * En mémoire du process plutôt que Redis : un seul process API tourne
 * aujourd'hui (voir déploiement), donc aucun risque d'incohérence entre
 * instances. À remplacer par un cache partagé (Redis) si l'API est un
 * jour scalée horizontalement — sinon chaque instance pourrait servir une
 * version différente jusqu'à TTL_MS après un changement.
 */
@Injectable()
export class AuthUserCacheService {
  private static readonly TTL_MS = 45_000;
  private readonly cache = new Map<string, CacheEntry>();

  get(userId: string): User | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }
    return entry.user;
  }

  set(userId: string, user: User): void {
    this.cache.set(userId, { user, expiresAt: Date.now() + AuthUserCacheService.TTL_MS });
  }

  /** À appeler après toute mutation qui change role/suspended/adminLevel/email pour ce user. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}
