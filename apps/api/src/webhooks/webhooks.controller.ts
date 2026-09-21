import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import Stripe from "stripe";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { StripeService } from "../stripe/stripe.service";
import { ReservationsService } from "../reservations/reservations.service";

/**
 * Réception des webhooks Stripe. Route publique (pas de JWT — Stripe
 * n'a pas de cookie de session) mais authentifiée différemment : la
 * signature `stripe-signature` prouve que l'appel vient bien de Stripe.
 * Nécessite `rawBody: true` dans NestFactory.create (voir main.ts) pour
 * que `req.rawBody` (Buffer non parsé) soit disponible ici — la
 * vérification de signature échoue sur un body déjà repassé en JSON.
 *
 * Journalisation (pour diagnostiquer sans le dashboard Stripe) : une ligne
 * par événement reçu (id, type, livemode) et une pour son résultat. Jamais
 * de payload, de secret ni d'email — uniquement des identifiants Stripe/internes.
 */
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly reservations: ReservationsService,
  ) {}

  @Public()
  @Post("stripe")
  @HttpCode(200)
  async handleStripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature: string) {
    if (!req.rawBody || !signature) {
      this.logger.warn("Webhook rejeté : corps brut ou en-tête stripe-signature absent.");
      throw new BadRequestException("Requête webhook invalide.");
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      // Cause n°1 en local : STRIPE_WEBHOOK_SECRET différent de celui affiché par `stripe listen`.
      this.logger.warn(`Webhook rejeté : signature invalide (${err instanceof Error ? err.message : "erreur inconnue"}).`);
      throw new BadRequestException("Signature webhook invalide.");
    }

    this.logger.log(`Événement reçu ${event.id} type=${event.type} livemode=${event.livemode}`);

    try {
      const result = await this.process(event);
      this.logger.log(`Événement ${event.id} (${event.type}) : ${result}`);
    } catch (err) {
      // 500 → Stripe rejoue l'événement plus tard (le traitement est idempotent).
      this.logger.error(
        `Événement ${event.id} (${event.type}) : échec du traitement — ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }

    return { received: true };
  }

  /** Traite l'événement et renvoie une description courte du résultat (journalisée par l'appelant). */
  private async process(event: Stripe.Event): Promise<string> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const reservationId = session.metadata?.reservationId;
        if (!reservationId) return "ignoré (session sans metadata.reservationId)";
        if (!session.payment_intent) return `ignoré (session ${session.id} sans payment_intent)`;
        if (session.payment_status !== "paid") return `ignoré (session ${session.id} payment_status=${session.payment_status})`;

        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
        const outcome = await this.reservations.markPaid(reservationId, paymentIntentId, session.id);
        const detail = `réservation ${reservationId}, session ${session.id}, payment_intent ${paymentIntentId}`;
        switch (outcome) {
          case "PAID":
            return `traité — transaction passée à PAID (${detail})`;
          case "ALREADY_PAID":
            return `déjà traité — transaction déjà PAID, rien à faire (${detail})`;
          case "NOT_FOUND":
            this.logger.error(`Paiement reçu pour une réservation sans transaction — à vérifier (${detail})`);
            return `ANOMALIE — transaction introuvable (${detail})`;
          case "UNEXPECTED_STATUS":
            this.logger.error(
              `Paiement encaissé sur une transaction qui n'est plus PENDING (annulée/refusée ?) — remboursement manuel à envisager (${detail})`,
            );
            return `ANOMALIE — transaction non modifiée, statut inattendu (${detail})`;
        }
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const onboardingComplete = Boolean(account.charges_enabled && account.payouts_enabled);
        const { count } = await this.prisma.commercantProfile.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeOnboardingComplete: onboardingComplete },
        });
        return `traité — compte ${account.id} onboarding=${onboardingComplete} (${count} profil(s) mis à jour)`;
      }

      default:
        // Événements non gérés au MVP (payment_failed, etc.) — ignorés
        // volontairement plutôt que de renvoyer une erreur à Stripe.
        return "ignoré (type non géré)";
    }
  }
}
