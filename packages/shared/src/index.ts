/**
 * Types, enums et constantes partagés entre le frontend (apps/web),
 * le backend (apps/api) et le package database.
 *
 * Ce fichier est la source de vérité pour tout ce qui doit rester
 * cohérent entre les deux applications (statuts, rôles, pays supportés...).
 */

// ---------------------------------------------------------------------------
// Marchés supportés (MVP : France + Espagne)
// ---------------------------------------------------------------------------

export const SUPPORTED_COUNTRIES = ["FR", "ES"] as const;
export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

export const SUPPORTED_LOCALES = ["fr", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "fr";

/** Devise unique pour le MVP (FR + ES sont toutes deux en zone euro). */
export const DEFAULT_CURRENCY = "EUR" as const;

/**
 * Langue préférée d'un utilisateur, stockée en base (miroir de l'enum
 * Prisma `Locale`, en majuscules). À ne pas confondre avec
 * `SupportedLocale` ci-dessus, qui code le préfixe d'URL (minuscules).
 */
export enum Locale {
  FR = "FR",
  ES = "ES",
}

// ---------------------------------------------------------------------------
// Rôles utilisateurs
// ---------------------------------------------------------------------------

export enum UserRole {
  ADMIN = "ADMIN",
  ANNONCEUR = "ANNONCEUR",
  COMMERCANT = "COMMERCANT",
}

// ---------------------------------------------------------------------------
// Vérification d'identité commerçant
// ---------------------------------------------------------------------------

/**
 * Type de numéro d'identification d'entreprise, dépendant du pays.
 * - FR : SIRET (14 chiffres)
 * - ES : NIF/CIF (identifiant fiscal espagnol)
 *
 * On stocke le pays + le numéro brut, et on applique une validation
 * différente selon le pays plutôt que de coder un format unique en dur.
 */
export enum BusinessIdType {
  SIRET = "SIRET", // France
  NIF_CIF = "NIF_CIF", // Espagne
}

export const BUSINESS_ID_TYPE_BY_COUNTRY: Record<SupportedCountry, BusinessIdType> = {
  FR: BusinessIdType.SIRET,
  ES: BusinessIdType.NIF_CIF,
};

export enum VerificationStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

// ---------------------------------------------------------------------------
// Espaces vitrine / tarification
// ---------------------------------------------------------------------------

/** Tailles usuelles proposées à titre indicatif ; le commerçant peut définir les siennes. */
export enum PosterSizePreset {
  A5 = "A5",
  A4 = "A4",
  A3 = "A3",
  A2 = "A2",
  A1 = "A1",
  VITRINE_ENTIERE = "VITRINE_ENTIERE",
  CUSTOM = "CUSTOM",
}

export enum RentalDurationType {
  SEMAINE = "SEMAINE",
  MOIS = "MOIS",
  LIBRE = "LIBRE",
}

// ---------------------------------------------------------------------------
// Réservations / transactions
// ---------------------------------------------------------------------------

export enum ReservationStatus {
  PENDING_VALIDATION = "PENDING_VALIDATION", // en attente de validation commerçant
  CONFIRMED = "CONFIRMED", // acceptée, paiement à effectuer / effectué
  ACTIVE = "ACTIVE", // affiche posée, en cours de location
  COMPLETED = "COMPLETED", // affiche retirée, terminée
  CANCELLED_BY_ANNONCEUR = "CANCELLED_BY_ANNONCEUR",
  CANCELLED_BY_COMMERCANT = "CANCELLED_BY_COMMERCANT",
  NO_SHOW = "NO_SHOW",
  DISPUTE = "DISPUTE",
}

export enum ModerationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  FAILED = "FAILED",
}

export enum InvoiceRecipientType {
  COMMERCANT = "COMMERCANT",
  PLATEFORME = "PLATEFORME",
}

export enum DisputeStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
}

export enum NotificationType {
  RESERVATION_REQUESTED = "RESERVATION_REQUESTED",
  RESERVATION_CONFIRMED = "RESERVATION_CONFIRMED",
  RESERVATION_REJECTED = "RESERVATION_REJECTED",
  RESERVATION_CANCELLED = "RESERVATION_CANCELLED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  RDV_REMINDER = "RDV_REMINDER",
  POSTER_INSTALLED = "POSTER_INSTALLED",
  CONTRACT_ENDING = "CONTRACT_ENDING",
  DISPUTE_OPENED = "DISPUTE_OPENED",
  DISPUTE_RESOLVED = "DISPUTE_RESOLVED",
  NEW_CHAT_MESSAGE = "NEW_CHAT_MESSAGE",
  REVIEW_RECEIVED = "REVIEW_RECEIVED",
}

// ---------------------------------------------------------------------------
// Paramètres plateforme (configurables par l'admin, valeurs par défaut ici)
// ---------------------------------------------------------------------------

/**
 * Taux de commission par défaut appliqué par la plateforme (15%).
 * Valeur de référence uniquement (ex: formulaire admin avant premier
 * chargement) : la valeur qui fait foi est celle stockée dans
 * `PlatformSettings.commissionRate`, modifiable par l'admin à tout moment.
 */
export const DEFAULT_COMMISSION_RATE = 0.15;

/** Délai (en heures) avant le RDV en-deçà duquel une annulation n'est plus gratuite. */
export const DEFAULT_FREE_CANCELLATION_HOURS = 48;
