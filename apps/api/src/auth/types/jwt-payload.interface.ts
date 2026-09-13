import { UserRole } from "@mivitrina/shared";

/** Payload du token d'accès (courte durée de vie). */
export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
}

/** Payload du refresh token. tokenVersion permet une invalidation globale. */
export interface RefreshTokenPayload {
  sub: string; // userId
  tokenVersion: number;
}

/** Payload des tokens à usage unique envoyés par email (vérification, reset). */
export interface EmailActionTokenPayload {
  sub: string; // userId
  purpose: "email-verify" | "password-reset";
  /// Snapshot du tokenVersion au moment de l'émission : si le mot de
  /// passe a déjà été changé depuis, le token de reset devient invalide.
  tokenVersion: number;
}
