import * as Joi from "joi";

/**
 * Schéma de validation des variables d'environnement, appliqué au
 * démarrage de l'application (voir AppModule -> ConfigModule.forRoot).
 * Fait échouer le boot immédiatement si une variable requise manque,
 * plutôt que de planter plus tard sur un appel précis.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().default(4000),
  WEB_APP_URL: Joi.string().uri().default("http://localhost:3000"),

  DATABASE_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("30d"),
  EMAIL_TOKEN_SECRET: Joi.string().min(16).required(),

  /// Domaine partagé pour les cookies (ex: ".mivitrina.es" en prod).
  /// Laisser vide en dev local (cookie scopé à l'hôte exact).
  COOKIE_DOMAIN: Joi.string().allow("").optional(),

  RESEND_API_KEY: Joi.string().allow("").optional(),
  RESEND_FROM_EMAIL: Joi.string().default("MiVitrina <no-reply@mivitrina.es>"),

  /// Stockage fichiers (S3 en prod, MinIO en dev — voir infra/docker-compose.yml).
  S3_ENDPOINT: Joi.string().uri().required(),
  S3_REGION: Joi.string().default("eu-west-3"),
  S3_BUCKET: Joi.string().required(),
  S3_ACCESS_KEY_ID: Joi.string().required(),
  S3_SECRET_ACCESS_KEY: Joi.string().required(),
  /// Base d'URL publique pour lire les fichiers uploadés (ex: un domaine
  /// CDN devant le bucket en prod). Par défaut, dérivée de S3_ENDPOINT +
  /// bucket (accès "path-style", ce que sert MinIO nativement).
  S3_PUBLIC_URL_BASE: Joi.string().uri().allow("").optional(),
  /// true pour MinIO (accès path-style obligatoire) ; false pour un vrai
  /// bucket AWS S3 (accès virtual-hosted-style par défaut).
  S3_FORCE_PATH_STYLE: Joi.boolean().default(true),

  /// Paiement (Stripe Connect, comptes Express). Clés de test tant que
  /// le compte Stripe n'est pas passé en production.
  STRIPE_SECRET_KEY: Joi.string().required(),
  /// Secret de signature des webhooks — fourni par `stripe listen` en
  /// dev local, ou par le endpoint webhook créé dans le dashboard en prod.
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
}).unknown(true);
