/**
 * Durées de vie par défaut (en ms) utilisées pour le `maxAge` des cookies.
 * La durée de vie réelle du JWT est pilotée par JWT_ACCESS_EXPIRES_IN /
 * JWT_REFRESH_EXPIRES_IN (voir env.validation.ts) ; si ces valeurs sont
 * changées côté env, le cookie peut légèrement diverger, sans risque :
 * un token expiré reste rejeté par la vérification de signature/exp.
 */
export const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export const EMAIL_VERIFY_TOKEN_TTL = "24h";
export const PASSWORD_RESET_TOKEN_TTL = "1h";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/**
 * `@nestjs/jwt` type son option `expiresIn` avec le type `StringValue`
 * de la lib `ms` (ex: "15m", "30d"), un type littéral gabarit. Nos
 * valeurs viennent d'env vars (validées par Joi au boot, voir
 * env.validation.ts) donc typées `string` — ce helper documente le
 * cast plutôt que de le disperser en `as any` dans AuthService.
 */
export function asJwtExpiry(value: string): NonNullable<import("@nestjs/jwt").JwtSignOptions["expiresIn"]> {
  return value as never;
}
