import { BadRequestException, Controller, Headers, HttpCode, Post, RawBodyRequest, Req } from "@nestjs/common";
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
 */
@Controller("webhooks")
export class WebhooksController {
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
      throw new BadRequestException("Requête webhook invalide.");
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(req.rawBody, signature);
    } catch {
      throw new BadRequestException("Signature webhook invalide.");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const reservationId = session.metadata?.reservationId;
        if (reservationId && session.payment_intent) {
          const paymentIntentId =
            typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
          await this.reservations.markPaid(reservationId, paymentIntentId);
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const onboardingComplete = Boolean(account.charges_enabled && account.payouts_enabled);
        await this.prisma.commercantProfile.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeOnboardingComplete: onboardingComplete },
        });
        break;
      }

      default:
        // Événements non gérés au MVP (payment_failed, etc.) — ignorés
        // volontairement plutôt que de renvoyer une erreur à Stripe.
        break;
    }

    return { received: true };
  }
}
