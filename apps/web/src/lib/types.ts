import type {
  UserRole,
  Locale,
  Country,
  VerificationStatus,
  BusinessIdType,
  PosterSizePreset,
  RentalDurationType,
  ReservationStatus,
  ModerationStatus,
  TransactionStatus,
  DisputeStatus,
  AdminLevel,
} from "@mivitrina/shared";

/** Reflète la sortie de AuthService.toSafeUser côté API (sans passwordHash/tokenVersion). */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  locale: Locale;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  suspended: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Non-null uniquement quand role === ADMIN — voir AdminLevel/ADMIN_PERMISSIONS. */
  adminLevel?: AdminLevel | null;
  commercantProfile?: CommercantProfileSummary | null;
  annonceurProfile?: AnnonceurProfileSummary | null;
}

export interface CommercantProfileSummary {
  id: string;
  businessName: string;
  country: Country;
  businessIdType: BusinessIdType;
  businessIdNumber: string;
  verificationStatus: VerificationStatus;
  verificationDocumentUrl: string | null;
  verificationNote: string | null;
  city: string;
}

export interface AnnonceurProfileSummary {
  id: string;
  /** Nom public (seul identifiant montré aux autres utilisateurs) — null pour les comptes antérieurs au champ. */
  displayName: string | null;
  companyName: string | null;
  country: Country;
}

export interface Photo {
  id: string;
  url: string;
}

export interface PricingOption {
  id: string;
  spaceId: string;
  durationType: RentalDurationType;
  price: string;
  minDurationDays: number | null;
  isActive: boolean;
}

export interface VitrineSpace {
  id: string;
  name: string;
  sizePreset: PosterSizePreset;
  customSizeLabel: string | null;
  widthCm: number | null;
  heightCm: number | null;
  description: string | null;
  isActive: boolean;
  photos: Photo[];
  pricingOptions: PricingOption[];
}

export interface MyVitrine {
  profile: {
    id: string;
    businessName: string;
    description: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    postalCode: string;
    verificationStatus: VerificationStatus;
    /** Le commerce a des coordonnées géocodées (condition, avec la vérification admin, pour apparaître dans la recherche géolocalisée). */
    hasCoordinates: boolean;
  };
  showcasePhotos: Photo[];
  spaces: VitrineSpace[];
}

/** Résultat de GET /discovery/search. */
export interface NearbyCommerce {
  id: string;
  businessName: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  spaceCount: number;
  minPrice: number | null;
  thumbnailUrl: string | null;
}

/** Résultat de GET /discovery/commercants/:id. */
export interface PublicCommerceProfile {
  id: string;
  businessName: string;
  description: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: Country;
  latitude: number;
  longitude: number;
  showcasePhotos: Photo[];
  spaces: VitrineSpace[];
}

/** Résultat de GET /commercants/me/stripe/status. */
export interface StripeStatus {
  connected: boolean;
  onboardingComplete: boolean;
}

export interface ReservationTransaction {
  amount: string;
  commissionRate: string;
  commissionAmount: string;
  commercantPayoutAmount: string;
  status: TransactionStatus;
}

/** Reflète la sortie des endpoints /reservations/* (avec relations incluses). */
export interface Reservation {
  id: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  posterUrl: string | null;
  moderationStatus: ModerationStatus;
  moderationNote: string | null;
  cancellationReason: string | null;
  /** URL de lecture signée — présente une fois que le commerçant a envoyé sa preuve de pose. */
  installPhotoUrl: string | null;
  installConfirmedAt: string | null;
  /** URL de lecture signée — présente une fois que le commerçant a envoyé sa preuve de retrait. */
  removalPhotoUrl: string | null;
  removalConfirmedAt: string | null;
  createdAt: string;
  space: {
    id: string;
    name: string;
    sizePreset: PosterSizePreset;
    customSizeLabel: string | null;
    commercantProfile?: { id: string; businessName: string; city: string };
  };
  pricingOption: PricingOption;
  transaction: ReservationTransaction;
  /**
   * Ce que le commerçant sait d'un annonceur (GET /reservations/received) :
   * de quoi le nommer publiquement (voir getAnnonceurDisplayName) et sa
   * photo — jamais son email ni son profil complet. `avatarUrl` : URL de
   * lecture signée, null si l'annonceur n'en a pas ajouté.
   */
  annonceurProfile?: {
    displayName: string | null;
    companyName: string | null;
    user: { avatarUrl: string | null };
  };
}

/** Résultat de GET /chat/threads. */
export interface ChatThreadSummary {
  id: string;
  otherPartyName: string;
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

/** Résultat de GET /chat/threads/:id/messages et POST .../messages. */
export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  flagged: boolean;
  flagReason: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Résultat de GET /admin/stats. */
export interface AdminStats {
  totalCommercants: number;
  totalAnnonceurs: number;
  pendingVerifications: number;
  openDisputes: number;
  activeReservations: number;
  totalCommissionRevenue: number;
}

/** Résultat de GET /admin/commercants/pending-verification. */
export interface PendingVerification {
  id: string;
  businessName: string;
  country: Country;
  businessIdType: BusinessIdType;
  businessIdNumber: string;
  city: string;
  email: string;
  createdAt: string;
  documentUrl: string | null;
}

/** Résultat de GET/PATCH /admin/settings. */
export interface PlatformSettings {
  id: string;
  commissionRate: string;
  freeCancellationHours: number;
  updatedAt: string;
}

/** Résultat de GET /admin/disputes. */
export interface AdminDispute {
  id: string;
  reservationId: string;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  refundAmount: string | null;
  createdAt: string;
  raisedBy: { email: string; role: UserRole };
  reservation: {
    id: string;
    status: ReservationStatus;
    space: { name: string; commercantProfile: { businessName: string } };
    annonceurProfile: { displayName: string | null; companyName: string | null; user: { email: string } };
    transaction: { amount: string; status: TransactionStatus; stripePaymentIntentId: string | null };
  };
}

/** Un élément de GET /admin/users. */
export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  suspended: boolean;
  emailVerified: boolean;
  displayName: string | null;
  verificationStatus: VerificationStatus | null;
}

/** Résultat de GET /admin/users/:id. */
export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  locale: Locale;
  suspended: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  verificationDocumentReadUrl: string | null;
  commercantProfile: {
    id: string;
    businessName: string;
    country: Country;
    businessIdType: BusinessIdType;
    businessIdNumber: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    verificationStatus: VerificationStatus;
    verificationNote: string | null;
    stripeOnboardingComplete: boolean;
  } | null;
  annonceurProfile: {
    id: string;
    /** Nom public — celui que voient les commerçants ; null pour les comptes antérieurs au champ. */
    displayName: string | null;
    companyName: string | null;
  } | null;
  disputesRaised: { id: string; reason: string; status: DisputeStatus; createdAt: string }[];
  reservations: {
    id: string;
    status: ReservationStatus;
    createdAt: string;
    startDate: string;
    endDate: string;
    space: { name: string } | { commercantProfile: { businessName: string } };
    annonceurProfile?: { user: { email: string }; displayName: string | null; companyName: string | null };
    transaction: { amount: string; status: TransactionStatus } | null;
  }[];
}

/** Un élément de GET /admin/reservations. */
export interface AdminReservationListItem {
  id: string;
  status: ReservationStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  space: { name: string; commercantProfile: { businessName: string } };
  annonceurProfile: { displayName: string | null; companyName: string | null; user: { email: string } };
  transaction: { amount: string; commissionAmount: string; status: TransactionStatus; refundedAmount: string; stripePaymentIntentId: string | null } | null;
}

/** Résultat de GET /admin/admins (liste) et POST /admin/admins (création). */
export interface AdminAccountListItem {
  id: string;
  email: string;
  name: string | null;
  adminLevel: AdminLevel | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Résultat de GET /admin/audit-log. */
export interface AuditLogEntry {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** Résultat de GET /commercants/me/stats. */
export interface CommercantStats {
  spacesCount: number;
  pendingRequestsCount: number;
  activeReservationsCount: number;
  totalPayout: number;
}

/** Résultat de GET /annonceurs/me/stats. */
export interface AnnonceurStats {
  activeReservationsCount: number;
  pendingRequestsCount: number;
  completedReservationsCount: number;
  totalSpent: number;
}
