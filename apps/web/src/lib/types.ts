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
} from "@mivitrina/shared";

/** Reflète la sortie de AuthService.toSafeUser côté API (sans passwordHash/tokenVersion). */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  locale: Locale;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  suspended: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    city: string;
    postalCode: string;
    verificationStatus: VerificationStatus;
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
  annonceurProfile?: { companyName: string | null; user: { email: string } };
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
    annonceurProfile: { user: { email: string } };
    transaction: { amount: string; status: TransactionStatus; stripePaymentIntentId: string | null };
  };
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
