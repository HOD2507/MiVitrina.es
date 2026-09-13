import { SetMetadata } from "@nestjs/common";

/**
 * Marque une route comme accessible sans authentification.
 * Le JwtAuthGuard global vérifie ce métadata pour laisser passer
 * les endpoints d'auth eux-mêmes (register, login, refresh...).
 */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
