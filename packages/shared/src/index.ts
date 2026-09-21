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
// Niveaux d'accès admin (sous-rôles à l'intérieur de UserRole.ADMIN)
// ---------------------------------------------------------------------------

/**
 * Un compte ADMIN a toujours l'un de ces niveaux (jamais `null` en usage
 * normal — nullable en base uniquement pour la période de transition
 * avant la migration de rétro-compatibilité, voir packages/database).
 * SUPERADMIN = accès total. SUPPORT et FINANCE sont deux périmètres
 * disjoints, pas des paliers d'un même axe : un compte FINANCE n'a pas
 * "moins" que SUPPORT, il a un périmètre différent (voir ADMIN_PERMISSIONS).
 */
export const AdminLevel = {
  SUPERADMIN: "SUPERADMIN",
  SUPPORT: "SUPPORT",
  FINANCE: "FINANCE",
} as const;
export type AdminLevel = (typeof AdminLevel)[keyof typeof AdminLevel];

/**
 * Permissions fines vérifiées côté API pour chaque action sensible du
 * panel admin — jamais une simple hiérarchie de niveaux, voir le
 * commentaire sur AdminLevel. Source unique partagée par apps/api (guard)
 * et apps/web (affichage conditionnel des sections) : les deux doivent
 * toujours s'accorder, d'où le partage via @mivitrina/shared plutôt que
 * deux copies qui pourraient diverger.
 */
export const AdminPermission = {
  USERS_VIEW: "users.view",
  USERS_SUSPEND: "users.suspend",
  USERS_DELETE: "users.delete",
  USERS_VERIFY: "users.verify",
  FINANCE_VIEW: "finance.view",
  FINANCE_REFUND: "finance.refund",
  SETTINGS_MANAGE: "settings.manage",
  ADMINS_MANAGE: "admins.manage",
  /** Bandeja de soporte : ver los tickets, responder, cambiar estado/prioridad, notas internas. */
  SUPPORT_MANAGE: "support.manage",
} as const;
export type AdminPermission = (typeof AdminPermission)[keyof typeof AdminPermission];

export const ADMIN_PERMISSIONS: Record<AdminLevel, AdminPermission[]> = {
  [AdminLevel.SUPERADMIN]: Object.values(AdminPermission),
  // "Soporte/Moderador" : voir/suspendre/vérifier les comptes — jamais les
  // supprimer (irréversible) ni toucher à l'argent ou à la gestion d'admins.
  [AdminLevel.SUPPORT]: [
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_SUSPEND,
    AdminPermission.USERS_VERIFY,
    AdminPermission.SUPPORT_MANAGE,
  ],
  // "Finanzas" : transactions, remboursements, règles de commission —
  // jamais suspendre/supprimer un compte ni gérer d'autres admins.
  [AdminLevel.FINANCE]: [AdminPermission.FINANCE_VIEW, AdminPermission.FINANCE_REFUND, AdminPermission.SETTINGS_MANAGE],
};

export function hasAdminPermission(level: AdminLevel | null | undefined, permission: AdminPermission): boolean {
  if (!level) return false;
  return ADMIN_PERMISSIONS[level].includes(permission);
}

// ---------------------------------------------------------------------------
// Journal d'audit admin (AuditLog) — liste canonique des actions
// ---------------------------------------------------------------------------

/**
 * Chaque action admin sensible écrit une entrée dans AuditLog avec l'une de
 * ces valeurs (voir AdminService.logAction côté API). Centralisé ici plutôt
 * que des chaînes en dur dispersées, pour que le backend (qui écrit) et le
 * frontend (qui filtre/affiche par type d'action, voir la page "Registro de
 * actividad") restent forcément d'accord sur l'ensemble des valeurs possibles.
 *
 * Les entrées marquées "réservé" n'ont encore aucun code qui les écrit — la
 * fonctionnalité correspondante (modération de contenu) n'existe pas encore
 * côté admin — mais le nom est fixé dès maintenant pour que son implémentation
 * future utilise directement la bonne valeur plutôt que d'en inventer une.
 */
export const AdminAuditAction = {
  USER_SUSPEND: "user.suspend",
  USER_UNSUSPEND: "user.unsuspend",
  USER_DELETE: "user.delete",
  VERIFICATION_REVIEW: "verification.review",
  ADMIN_CREATE: "admin.create",
  ADMIN_UPDATE_LEVEL: "admin.update_level",
  ADMIN_DELETE: "admin.delete",
  RESERVATION_FORCE_REFUND: "reservation.force_refund",
  DISPUTE_RESOLVE: "dispute.resolve",
  SETTINGS_UPDATE: "settings.update",
  /** Cambio de estado o prioridad de un ticket de soporte (las respuestas y notas quedan en el propio hilo). */
  SUPPORT_TICKET_UPDATE: "support.ticket_update",
  /** Réservé : approbation d'une affiche publicitaire par un admin (file de modération non encore implémentée). */
  POSTER_APPROVE: "poster.approve",
  /** Réservé : rejet d'une affiche publicitaire par un admin. */
  POSTER_REJECT: "poster.reject",
  /** Réservé : suppression d'une affiche/publication par un admin. */
  POSTER_DELETE: "poster.delete",
} as const;
export type AdminAuditAction = (typeof AdminAuditAction)[keyof typeof AdminAuditAction];

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

// ---------------------------------------------------------------------------
// Support client (tickets)
// ---------------------------------------------------------------------------

export const SupportTicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type SupportTicketStatus = (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];

export const SupportTicketCategory = {
  PAYMENT: "PAYMENT",
  RESERVATION: "RESERVATION",
  ACCOUNT: "ACCOUNT",
  TECHNICAL: "TECHNICAL",
  OTHER: "OTHER",
} as const;
export type SupportTicketCategory = (typeof SupportTicketCategory)[keyof typeof SupportTicketCategory];

export const SupportTicketPriority = {
  NORMAL: "NORMAL",
  URGENT: "URGENT",
} as const;
export type SupportTicketPriority = (typeof SupportTicketPriority)[keyof typeof SupportTicketPriority];

/** Límites compartidos: la API valida, el formulario web los aplica (maxLength) para no llegar a un 400. */
export const SUPPORT_LIMITS = {
  SUBJECT_MIN: 3,
  SUBJECT_MAX: 120,
  MESSAGE_MIN: 1,
  MESSAGE_MAX: 5000,
  /** Tickets abiertos (OPEN/IN_PROGRESS) simultáneos por usuario: freno básico al spam (no hay rate limiter global). */
  MAX_ACTIVE_TICKETS_PER_USER: 5,
} as const;

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

// ---------------------------------------------------------------------------
// Identité publique d'un annonceur
// ---------------------------------------------------------------------------

/** Libellé de repli quand un annonceur n'a ni nom public ni raison sociale. */
export const ANNONCEUR_FALLBACK_NAME: Record<Locale, string> = {
  ES: "Anunciante",
  EN: "Advertiser",
};

/** Bornes de longueur d'un nom public d'annonceur (validation API + attributs du formulaire). */
export const ANNONCEUR_DISPLAY_NAME_MIN_LENGTH = 2;
export const ANNONCEUR_DISPLAY_NAME_MAX_LENGTH = 50;

/**
 * Un nom public est valide s'il fait 2 à 50 caractères (espaces autour
 * ignorés) et ne contient pas de "@" : sans cette dernière règle, on
 * pourrait y coller son email, ce qui l'afficherait en public.
 * La même règle est appliquée côté API (RegisterDto / UpdateAccountDto).
 */
export function isValidAnnonceurDisplayName(value: string): boolean {
  const name = value.trim();
  return (
    name.length >= ANNONCEUR_DISPLAY_NAME_MIN_LENGTH &&
    name.length <= ANNONCEUR_DISPLAY_NAME_MAX_LENGTH &&
    !name.includes("@")
  );
}

/**
 * Nom sous lequel un annonceur est affiché aux AUTRES utilisateurs
 * (commerçants, liste de chat...) : nom public, sinon raison sociale,
 * sinon un libellé générique. Ne retombe volontairement JAMAIS sur l'email
 * (ni sur sa partie avant le @, qui en révèle l'essentiel) ni sur le nom
 * privé du compte (`User.name`) : l'email est une donnée interne, pas une
 * identité publique. À utiliser partout où un annonceur est nommé, côté
 * API comme côté web, pour que la règle reste identique.
 *
 * `locale` accepte "ES"/"EN" (API), "es"/"en" (web) ou un tag BCP-47
 * ("en-GB", "es-ES") ; toute autre valeur retombe sur l'espagnol, langue
 * par défaut de la plateforme.
 */
export function getAnnonceurDisplayName(
  profile: { displayName?: string | null; companyName?: string | null } | null | undefined,
  locale: string = Locale.ES,
): string {
  const key: Locale = locale.toUpperCase().startsWith(Locale.EN) ? Locale.EN : Locale.ES;
  return profile?.displayName?.trim() || profile?.companyName?.trim() || ANNONCEUR_FALLBACK_NAME[key];
}
