import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  readonly client: Stripe;

  constructor(private readonly config: ConfigService) {
    this.client = new Stripe(this.config.get<string>("STRIPE_SECRET_KEY")!);
  }

  /**
   * Compte connecté Express pour un commerçant. "Express" délègue tout le
   * KYC/formulaire bancaire à l'UI hébergée par Stripe (`createAccountLink`)
   * — on n'a jamais à manipuler de données bancaires nous-mêmes.
   */
  async createExpressAccount(email: string, country: "FR" | "ES") {
    const account = await this.client.accounts.create({
      type: "express",
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account.id;
  }

  /** Lien d'onboarding à usage unique (expire vite) — à ouvrir immédiatement côté client. */
  async createAccountLink(stripeAccountId: string, refreshUrl: string, returnUrl: string) {
    const link = await this.client.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return link.url;
  }

  async getAccountStatus(stripeAccountId: string) {
    const account = await this.client.accounts.retrieve(stripeAccountId);
    return {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }

  /**
   * Session Checkout hébergée par Stripe pour le paiement de l'annonceur.
   * Le montant est encaissé sur le compte PLATEFORME (pas de
   * `transfer_data` ici) : le virement vers le commerçant se fait à part,
   * uniquement après validation de sa demande (voir `createTransfer`) —
   * ce découplage permet le remboursement intégral si le commerçant refuse.
   */
  async createCheckoutSession(params: {
    amountCents: number;
    reservationId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    /** Textes affichés sur la page Stripe — localisés côté appelant (voir ReservationsService). */
    productName: string;
    productDescription?: string;
    /** Message rassurant sous le bouton "Payer" (ex: remboursement si refus). */
    submitMessage?: string;
    locale?: "es" | "en";
  }) {
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: params.amountCents,
            product_data: {
              name: params.productName,
              ...(params.productDescription ? { description: params.productDescription } : {}),
            },
          },
          quantity: 1,
        },
      ],
      customer_email: params.customerEmail,
      ...(params.locale ? { locale: params.locale } : {}),
      ...(params.submitMessage ? { custom_text: { submit: { message: params.submitMessage } } } : {}),
      metadata: { reservationId: params.reservationId },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    return session;
  }

  /** Relit une session (état `open|complete|expired`, `payment_status`, `url`) — source de vérité si le webhook n'est pas arrivé. */
  async retrieveCheckoutSession(sessionId: string) {
    return this.client.checkout.sessions.retrieve(sessionId);
  }

  /** Invalide une session encore ouverte pour qu'elle ne puisse plus être payée (annulation, montant changé). */
  async expireCheckoutSession(sessionId: string) {
    return this.client.checkout.sessions.expire(sessionId);
  }

  /** Virement vers le commerçant — uniquement la part hors commission. */
  async createTransfer(params: { amountCents: number; destinationAccountId: string; reservationId: string }) {
    return this.client.transfers.create({
      amount: params.amountCents,
      currency: "eur",
      destination: params.destinationAccountId,
      transfer_group: params.reservationId,
    });
  }

  /** `amountCents` omis = remboursement intégral ; sinon remboursement partiel (ex: résolution de litige). */
  async refund(paymentIntentId: string, amountCents?: number) {
    return this.client.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountCents !== undefined ? { amount: amountCents } : {}),
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string) {
    return this.client.webhooks.constructEvent(rawBody, signature, this.config.get<string>("STRIPE_WEBHOOK_SECRET")!);
  }
}
