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
}).unknown(true);
