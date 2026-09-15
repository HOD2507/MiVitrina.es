/**
 * Types, enums et constantes partagés entre le frontend (apps/web),
 * le backend (apps/api) et le package database.
 *
 * Ce fichier est la source de vérité pour tout ce qui doit rester
 * cohérent entre les deux applications (statuts, rôles, pays supportés...).
 *
 * Convention importante : tous les enums métier sont déclarés comme un
 * objet `const` + un type dérivé (`(typeof X)[keyof typeof X]`), exactement
 * comme le fait le client Prisma généré — PAS comme un `enum` TypeScript.
 * Un `enum` TS a un typage nominal qui empêche l'assignation depuis/vers
 * le type correspondant généré par Prisma (même si les valeurs textuelles
 * sont identiques). En restant sur de simples unions de string literals,
 * les valeurs circulent librement entre @mivitrina/database (API) et
 * @mivitrina/shared (API + frontend) sans cast.
 */

// ---------------------------------------------------------------------------
// Marchés supportés (recentré sur l'Espagne pour le lancement — voir
// docs/ARCHITECTURE.md ; la France reste dans le schéma pour une
// réouverture ultérieure mais n'est plus proposée nulle part côté UI)
// ---------------------------------------------------------------------------

export const Country = {
  FR: "FR",
  ES: "ES",
} as const;
export type Country = (typeof Country)[keyof typeof Country];

export const SUPPORTED_COUNTRIES = Object.values(Country);
/** @deprecated utiliser `Country` directement — conservé pour compatibilité. */
export type SupportedCountry = Country;

export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "es";

/** Devise unique pour le MVP (Espagne est en zone euro). */
export const DEFAULT_CURRENCY = "EUR" as const;

/**
 * Langue préférée d'un utilisateur, stockée en base (miroir de l'enum
 * Prisma `Locale`, en majuscules). À ne pas confondre avec
 * `SupportedLocale` ci-dessus, qui code le préfixe d'URL (minuscules).
 */
export const Locale = {
  ES: "ES",
  EN: "EN",
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

// ---------------------------------------------------------------------------
// Rôles utilisateurs
// ---------------------------------------------------------------------------

export const UserRole = {
  ADMIN: "ADMIN",
  ANNONCEUR: "ANNONCEUR",
  COMMERCANT: "COMMERCANT",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

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
export const BusinessIdType = {
  SIRET: "SIRET", // France
  NIF_CIF: "NIF_CIF", // Espagne
} as const;
export type BusinessIdType = (typeof BusinessIdType)[keyof typeof BusinessIdType];

export const BUSINESS_ID_TYPE_BY_COUNTRY: Record<Country, BusinessIdType> = {
  FR: BusinessIdType.SIRET,
  ES: BusinessIdType.NIF_CIF,
};

export const VerificationStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

// ---------------------------------------------------------------------------
// Espaces vitrine / tarification
// ---------------------------------------------------------------------------

/** Tailles usuelles proposées à titre indicatif ; le commerçant peut définir les siennes. */
export const PosterSizePreset = {
  A5: "A5",
  A4: "A4",
  A3: "A3",
  A2: "A2",
  A1: "A1",
  VITRINE_ENTIERE: "VITRINE_ENTIERE",
  CUSTOM: "CUSTOM",
} as const;
export type PosterSizePreset = (typeof PosterSizePreset)[keyof typeof PosterSizePreset];

export const RentalDurationType = {
  SEMAINE: "SEMAINE",
  MOIS: "MOIS",
  LIBRE: "LIBRE",
} as const;
export type RentalDurationType = (typeof RentalDurationType)[keyof typeof RentalDurationType];

// ---------------------------------------------------------------------------
// Réservations / transactions
// ---------------------------------------------------------------------------

export const ReservationStatus = {
  PENDING_VALIDATION: "PENDING_VALIDATION", // en attente de validation commerçant
  CONFIRMED: "CONFIRMED", // acceptée, paiement à effectuer / effectué
  ACTIVE: "ACTIVE", // affiche posée, en cours de location
  COMPLETED: "COMPLETED", // affiche retirée, terminée
  CANCELLED_BY_ANNONCEUR: "CANCELLED_BY_ANNONCEUR",
  CANCELLED_BY_COMMERCANT: "CANCELLED_BY_COMMERCANT",
  NO_SHOW: "NO_SHOW",
  DISPUTE: "DISPUTE",
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const ModerationStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ModerationStatus = (typeof ModerationStatus)[keyof typeof ModerationStatus];

export const TransactionStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  FAILED: "FAILED",
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const InvoiceRecipientType = {
  COMMERCANT: "COMMERCANT",
  PLATEFORME: "PLATEFORME",
} as const;
export type InvoiceRecipientType = (typeof InvoiceRecipientType)[keyof typeof InvoiceRecipientType];

export const DisputeStatus = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const NotificationType = {
  RESERVATION_REQUESTED: "RESERVATION_REQUESTED",
  RESERVATION_CONFIRMED: "RESERVATION_CONFIRMED",
  RESERVATION_REJECTED: "RESERVATION_REJECTED",
  RESERVATION_CANCELLED: "RESERVATION_CANCELLED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  RDV_REMINDER: "RDV_REMINDER",
  POSTER_INSTALLED: "POSTER_INSTALLED",
  CONTRACT_ENDING: "CONTRACT_ENDING",
  DISPUTE_OPENED: "DISPUTE_OPENED",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
  NEW_CHAT_MESSAGE: "NEW_CHAT_MESSAGE",
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

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
