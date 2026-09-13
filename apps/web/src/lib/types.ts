import type { UserRole, Locale, Country, VerificationStatus, BusinessIdType } from "@mivitrina/shared";

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
