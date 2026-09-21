/**
 * Un commerce ne peut recevoir des réservations que si son onboarding Stripe
 * Connect est terminé : sans cela, on encaisse l'annonceur mais on ne pourrait
 * jamais reverser la part du commerçant (voir ReservationsService.respond).
 *
 * `stripeOnboardingComplete` = `charges_enabled && payouts_enabled` côté Stripe
 * (donc implique aussi l'existence du compte connecté). Le champ est maintenu par
 * le webhook `account.updated` et par GET /commercants/me/stripe/status ; on lit
 * cette valeur en base, sans appeler Stripe à chaque recherche publique.
 *
 * Source unique de la règle : la recherche (discovery.service.ts) applique la même
 * condition en SQL (`cp."stripeOnboardingComplete"`) — à garder alignée avec ceci.
 */
export function canReceiveBookings(profile: { stripeOnboardingComplete: boolean }): boolean {
  return profile.stripeOnboardingComplete;
}

/** Code lisible par le frontend pour afficher le message dans la langue de l'utilisateur. */
export const MERCHANT_NOT_BOOKABLE_CODE = "MERCHANT_NOT_BOOKABLE";
