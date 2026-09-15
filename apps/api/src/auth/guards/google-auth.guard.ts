import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UserRole } from "@mivitrina/shared";

/**
 * Fait transiter le rôle choisi (uniquement utile pour une inscription,
 * ignoré pour une connexion) à travers le param `state` standard d'OAuth2
 * — Google nous le renvoie tel quel sur /auth/google/callback.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const role = req.query.role === UserRole.COMMERCANT ? UserRole.COMMERCANT : UserRole.ANNONCEUR;
    return { state: role };
  }
}
