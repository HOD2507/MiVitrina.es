import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type Profile, type VerifyCallback } from "passport-google-oauth20";

export interface GoogleProfile {
  email: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Stratégie Google OAuth. `clientID`/`clientSecret` restent optionnels côté
 * validation d'env (voir env.validation.ts) : tant qu'ils ne sont pas
 * configurés, on passe des valeurs bidon pour que le constructeur de
 * passport-google-oauth20 (qui exige une chaîne non vide) ne fasse pas
 * planter tout le process au démarrage. Le bouton "Continuer avec
 * Google" n'est de toute façon affiché côté front que si
 * GET /auth/config indique que c'est configuré (voir AuthController).
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>("GOOGLE_CLIENT_ID") || "not-configured",
      clientSecret: config.get<string>("GOOGLE_CLIENT_SECRET") || "not-configured",
      callbackURL: config.get<string>("GOOGLE_CALLBACK_URL") || "http://localhost:4000/api/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error("Google n'a renvoyé aucune adresse email."), undefined);
    }
    const googleUser: GoogleProfile = {
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
    done(null, googleUser);
  }
}
