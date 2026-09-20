import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ModerationStatus,
  RentalDurationType,
  ReservationStatus,
  TransactionStatus,
  VerificationStatus,
} from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { StripeService } from "../stripe/stripe.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { RespondReservationDto } from "./dto/respond-reservation.dto";
import { ConfirmPhotoStepDto } from "./dto/confirm-photo-step.dto";

/** Statuts qui bloquent réellement le créneau d'un espace (occupent le calendrier). */
const BLOCKING_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING_VALIDATION,
  ReservationStatus.CONFIRMED,
  ReservationStatus.ACTIVE,
];

/** Convertit un montant euros (Decimal Prisma/number/string) en centimes entiers pour l'API Stripe. */
function toCents(amount: { toString(): string } | number): number {
  return Math.round(Number(amount) * 100);
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Ajoute une durée à une date selon le type de tarif choisi.
   * Utilise systématiquement les méthodes UTC (`setUTCDate`/`setUTCMonth`),
   * jamais les méthodes locales (`setDate`/`setMonth`) : une date reçue en
   * ISO ("2026-10-01") est parsée en UTC minuit, donc la faire glisser
   * avec des méthodes en heure locale peut décaler le résultat d'une
   * heure sur un changement d'heure (ex: le passage heure d'été/hiver
   * fin octobre en Europe) — bug constaté en testant un vrai scénario
   * "1 mois" à cheval sur ce changement.
   * NB: l'ajout d'un mois peut glisser en cas de fin de mois (31 janvier
   * + 1 mois -> 3 mars) ; compromis usuel accepté au MVP.
   */
  private computeEndDate(startDate: Date, durationType: RentalDurationType, customDurationDays?: number): Date {
    const end = new Date(startDate);
    if (durationType === RentalDurationType.SEMAINE) {
      end.setUTCDate(end.getUTCDate() + 7);
    } else if (durationType === RentalDurationType.MOIS) {
      end.setUTCMonth(end.getUTCMonth() + 1);
    } else {
      end.setUTCDate(end.getUTCDate() + (customDurationDays ?? 0));
    }
    return end;
  }

  async create(userId: string, dto: CreateReservationDto) {
    const annonceurProfile = await this.prisma.annonceurProfile.findUnique({ where: { userId } });
    if (!annonceurProfile) {
      throw new BadRequestException("Profil annonceur introuvable.");
    }

    const pricingOption = await this.prisma.pricingOption.findUnique({
      where: { id: dto.pricingOptionId },
      include: { space: { include: { commercantProfile: true } } },
    });

    if (!pricingOption || pricingOption.spaceId !== dto.spaceId || !pricingOption.isActive) {
      throw new NotFoundException("Tarif introuvable.");
    }
    if (!pricingOption.space.isActive) {
      throw new BadRequestException("Cet espace n'est plus disponible.");
    }
    if (pricingOption.space.commercantProfile.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new BadRequestException("Ce commerce n'est pas encore vérifié.");
    }

    if (pricingOption.durationType === RentalDurationType.LIBRE) {
      const min = pricingOption.minDurationDays ?? 1;
      if (!dto.customDurationDays || dto.customDurationDays < min) {
        throw new BadRequestException(`Durée minimale pour ce tarif : ${min} jour(s).`);
      }
    }

    const startDate = new Date(dto.startDate);
    if (Number.isNaN(startDate.getTime()) || startDate < new Date(Date.now() - 24 * 3600 * 1000)) {
      throw new BadRequestException("Date de début invalide.");
    }
    const endDate = this.computeEndDate(startDate, pricingOption.durationType, dto.customDurationDays);

    // Chevauchement avec une réservation déjà active/en attente sur ce même espace.
    const overlapping = await this.prisma.reservation.findFirst({
      where: {
        spaceId: dto.spaceId,
        status: { in: BLOCKING_STATUSES },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
    if (overlapping) {
      throw new BadRequestException("Cet espace est déjà réservé sur cette période.");
    }

    const settings = await this.prisma.platformSettings.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    });

    const amount = Number(pricingOption.price);
    const commissionRate = Number(settings.commissionRate);
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;

    return this.prisma.reservation.create({
      data: {
        annonceurProfileId: annonceurProfile.id,
        spaceId: dto.spaceId,
        pricingOptionId: dto.pricingOptionId,
        startDate,
        endDate,
        transaction: {
          create: {
            amount,
            commissionRate,
            commissionAmount,
            commercantPayoutAmount: amount - commissionAmount,
          },
        },
      },
      include: { transaction: true },
    });
  }

  /** Ownership : la réservation doit appartenir à l'annonceur courant. */
  private async getOwnReservationOrThrow(userId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        annonceurProfile: { include: { user: true } },
        space: { include: { commercantProfile: true } },
        transaction: true,
      },
    });
    if (!reservation || reservation.annonceurProfile.userId !== userId) {
      throw new NotFoundException("Réservation introuvable.");
    }
    return reservation;
  }

  /** Ownership : la réservation doit porter sur un espace du commerçant courant. */
  private async getReceivedReservationOrThrow(userId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { space: { include: { commercantProfile: true } } },
    });
    if (!reservation || reservation.space.commercantProfile.userId !== userId) {
      throw new NotFoundException("Réservation introuvable.");
    }
    return reservation;
  }

  async confirmPoster(userId: string, reservationId: string, key: string) {
    const reservation = await this.getOwnReservationOrThrow(userId, reservationId);
    if (reservation.status !== ReservationStatus.PENDING_VALIDATION) {
      throw new BadRequestException("Cette réservation n'est plus modifiable.");
    }
    if (!key.startsWith(`poster/${userId}/`)) {
      throw new ForbiddenException("Ce fichier ne vous appartient pas.");
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        posterFileUrl: this.storage.getFileUrl(key),
        moderationStatus: ModerationStatus.PENDING,
        moderationNote: null,
      },
    });
  }

  /**
   * Crée une session Stripe Checkout hébergée pour régler la réservation.
   * L'argent est encaissé sur le compte PLATEFORME (pas de virement direct
   * au commerçant ici) : il ne sera transféré qu'à l'approbation de la
   * demande (voir `respond`), ce qui permet un remboursement intégral et
   * immédiat si le commerçant refuse.
   */
  async createCheckoutSession(userId: string, reservationId: string, webAppUrl: string) {
    const reservation = await this.getOwnReservationOrThrow(userId, reservationId);
    if (reservation.status !== ReservationStatus.PENDING_VALIDATION) {
      throw new BadRequestException("Cette réservation n'est plus modifiable.");
    }
    if (reservation.transaction!.status === TransactionStatus.PAID) {
      throw new BadRequestException("Cette réservation est déjà payée.");
    }

    // La page Stripe est hébergée par Stripe (on n'en contrôle pas la mise en
    // page), mais on maîtrise ce qu'elle dit : nom du produit, détail de la
    // réservation et message de réassurance, dans la langue de l'annonceur.
    const isEnglish = reservation.annonceurProfile.user.locale === "EN";
    const dateFmt = new Intl.DateTimeFormat(isEnglish ? "en-GB" : "es-ES", { dateStyle: "medium", timeZone: "UTC" });
    const businessName = reservation.space.commercantProfile.businessName;
    const period = `${dateFmt.format(reservation.startDate)} → ${dateFmt.format(reservation.endDate)}`;

    const session = await this.stripe.createCheckoutSession({
      amountCents: toCents(reservation.transaction!.amount),
      reservationId,
      customerEmail: reservation.annonceurProfile.user.email,
      successUrl: `${webAppUrl}/mes-reservations?payment=success`,
      cancelUrl: `${webAppUrl}/mes-reservations?payment=cancelled`,
      locale: isEnglish ? "en" : "es",
      productName: isEnglish
        ? `Shop-window ad space — ${businessName}`
        : `Espacio publicitario en escaparate — ${businessName}`,
      productDescription: `${reservation.space.name} · ${period}`,
      submitMessage: isEnglish
        ? "If the shop owner declines your request, you are automatically refunded in full."
        : "Si el comerciante rechaza tu solicitud, te reembolsamos el importe completo automáticamente.",
    });

    return { url: session.url };
  }

  async cancel(userId: string, reservationId: string) {
    const reservation = await this.getOwnReservationOrThrow(userId, reservationId);
    if (reservation.status !== ReservationStatus.PENDING_VALIDATION) {
      throw new BadRequestException("Seule une demande en attente peut être annulée.");
    }

    const wasPaid = reservation.transaction!.status === TransactionStatus.PAID;
    if (wasPaid && reservation.transaction!.stripePaymentIntentId) {
      await this.stripe.refund(reservation.transaction!.stripePaymentIntentId);
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CANCELLED_BY_ANNONCEUR,
        cancelledAt: new Date(),
        cancelledById: userId,
        cancellationReason: "Annulée par l'annonceur avant réponse du commerçant.",
        transaction: {
          update: wasPaid
            ? { status: TransactionStatus.REFUNDED, refundedAmount: reservation.transaction!.amount }
            : { status: TransactionStatus.FAILED },
        },
      },
    });
  }

  async listMine(userId: string) {
    const annonceurProfile = await this.prisma.annonceurProfile.findUnique({ where: { userId } });
    if (!annonceurProfile) return [];

    const reservations = await this.prisma.reservation.findMany({
      where: { annonceurProfileId: annonceurProfile.id },
      orderBy: { createdAt: "desc" },
      include: {
        space: { include: { commercantProfile: true } },
        pricingOption: true,
        transaction: true,
      },
    });

    return Promise.all(reservations.map((r) => this.withPresignedPoster(r)));
  }

  async listReceived(userId: string) {
    const commercantProfile = await this.prisma.commercantProfile.findUnique({ where: { userId } });
    if (!commercantProfile) return [];

    const reservations = await this.prisma.reservation.findMany({
      where: { space: { commercantProfileId: commercantProfile.id } },
      orderBy: { createdAt: "desc" },
      include: {
        space: true,
        pricingOption: true,
        transaction: true,
        annonceurProfile: { include: { user: { select: { email: true, name: true, avatarUrl: true } } } },
      },
    });

    return Promise.all(
      reservations.map(async (r) => {
        const withFiles = await this.withPresignedPoster(r);
        // Photo de l'annonceur : lisible seulement via URL signée (bucket privé).
        const avatarUrl = await this.presignIfPresent(r.annonceurProfile.user.avatarUrl);
        return {
          ...withFiles,
          annonceurProfile: { ...r.annonceurProfile, user: { ...r.annonceurProfile.user, avatarUrl } },
        };
      }),
    );
  }

  async respond(userId: string, reservationId: string, dto: RespondReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { space: { include: { commercantProfile: true } }, transaction: true },
    });
    if (!reservation || reservation.space.commercantProfile.userId !== userId) {
      throw new NotFoundException("Réservation introuvable.");
    }
    if (reservation.status !== ReservationStatus.PENDING_VALIDATION) {
      throw new BadRequestException("Cette demande a déjà été traitée.");
    }

    if (dto.action === "approve") {
      if (!reservation.posterFileUrl) {
        throw new BadRequestException("L'annonceur n'a pas encore envoyé son affiche.");
      }
      if (reservation.transaction!.status !== TransactionStatus.PAID) {
        throw new BadRequestException("L'annonceur n'a pas encore réglé cette réservation.");
      }

      const { commercantProfile } = reservation.space;
      if (!commercantProfile.stripeAccountId || !commercantProfile.stripeOnboardingComplete) {
        throw new BadRequestException(
          "Connectez votre compte Stripe (voir votre tableau de bord) avant d'accepter des réservations payantes.",
        );
      }

      const transfer = await this.stripe.createTransfer({
        amountCents: toCents(reservation.transaction!.commercantPayoutAmount),
        destinationAccountId: commercantProfile.stripeAccountId,
        reservationId,
      });

      return this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CONFIRMED,
          moderationStatus: ModerationStatus.APPROVED,
          moderationNote: dto.moderationNote,
          moderatedById: userId,
          moderatedAt: new Date(),
          transaction: { update: { stripeTransferId: transfer.id } },
        },
      });
    }

    // action === "reject"
    const wasPaid = reservation.transaction!.status === TransactionStatus.PAID;
    if (wasPaid && reservation.transaction!.stripePaymentIntentId) {
      await this.stripe.refund(reservation.transaction!.stripePaymentIntentId);
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CANCELLED_BY_COMMERCANT,
        moderationStatus: ModerationStatus.REJECTED,
        moderationNote: dto.rejectionReason,
        moderatedById: userId,
        moderatedAt: new Date(),
        cancelledAt: new Date(),
        cancelledById: userId,
        cancellationReason: dto.rejectionReason,
        transaction: {
          update: wasPaid
            ? { status: TransactionStatus.REFUNDED, refundedAmount: reservation.transaction!.amount }
            : // Rien n'a encore été débité : FAILED documente qu'aucun
              // encaissement n'aura lieu, plutôt que REFUNDED qui
              // impliquerait un remboursement d'argent effectivement perçu.
              { status: TransactionStatus.FAILED },
        },
      },
    });
  }

  /** Appelé par le webhook Stripe `checkout.session.completed`. */
  async markPaid(reservationId: string, paymentIntentId: string) {
    await this.prisma.transaction.update({
      where: { reservationId },
      data: { status: TransactionStatus.PAID, paidAt: new Date(), stripePaymentIntentId: paymentIntentId },
    });
  }

  /**
   * Le commerçant a physiquement posé l'affiche en vitrine et envoie une
   * photo comme preuve. Ne change pas encore le statut : c'est la
   * confirmation de l'annonceur (`confirmInstall`) qui fait passer la
   * réservation en ACTIVE — la simple photo du commerçant ne suffit pas
   * (double confirmation, voir docs/ARCHITECTURE.md).
   */
  async uploadInstallPhoto(userId: string, reservationId: string, key: string) {
    const reservation = await this.getReceivedReservationOrThrow(userId, reservationId);
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException("La pose ne peut être déclarée que pour une réservation confirmée.");
    }
    if (!key.startsWith(`install-photo/${userId}/`)) {
      throw new ForbiddenException("Ce fichier ne vous appartient pas.");
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { installPhotoUrl: this.storage.getFileUrl(key), installConfirmedAt: null },
    });
  }

  /**
   * L'annonceur confirme (ou conteste) la photo de pose envoyée par le
   * commerçant. `dispute` ouvre un vrai litige (`Dispute`, status OPEN) —
   * la réservation passe en statut DISPUTE, en attente d'arbitrage admin
   * (tableau de bord admin à venir), plutôt qu'une simple boucle de
   * refus/réenvoi : une contestation sur une preuve de pose est un
   * désaccord de fait entre les deux parties, pas un détail à corriger.
   */
  async confirmInstall(userId: string, reservationId: string, dto: ConfirmPhotoStepDto) {
    const reservation = await this.getOwnReservationOrThrow(userId, reservationId);
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException("Cette réservation n'est pas en attente de confirmation de pose.");
    }
    if (!reservation.installPhotoUrl) {
      throw new BadRequestException("Le commerçant n'a pas encore envoyé de photo de pose.");
    }

    if (dto.action === "dispute") {
      await this.prisma.dispute.create({
        data: { reservationId, raisedById: userId, reason: dto.reason! },
      });
      return this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.DISPUTE },
      });
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.ACTIVE, installConfirmedAt: new Date() },
    });
  }

  /**
   * Le commerçant a retiré l'affiche en fin de location et envoie une
   * photo comme preuve — même logique à double confirmation que la pose.
   */
  async uploadRemovalPhoto(userId: string, reservationId: string, key: string) {
    const reservation = await this.getReceivedReservationOrThrow(userId, reservationId);
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException("Le retrait ne peut être déclaré que pour une réservation en cours.");
    }
    if (!key.startsWith(`removal-photo/${userId}/`)) {
      throw new ForbiddenException("Ce fichier ne vous appartient pas.");
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { removalPhotoUrl: this.storage.getFileUrl(key), removalConfirmedAt: null },
    });
  }

  /** L'annonceur confirme (ou conteste) la photo de retrait — clôture la réservation si tout est en ordre. */
  async confirmRemoval(userId: string, reservationId: string, dto: ConfirmPhotoStepDto) {
    const reservation = await this.getOwnReservationOrThrow(userId, reservationId);
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException("Cette réservation n'est pas en attente de confirmation de retrait.");
    }
    if (!reservation.removalPhotoUrl) {
      throw new BadRequestException("Le commerçant n'a pas encore envoyé de photo de retrait.");
    }

    if (dto.action === "dispute") {
      await this.prisma.dispute.create({
        data: { reservationId, raisedById: userId, reason: dto.reason! },
      });
      return this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.DISPUTE },
      });
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.COMPLETED, removalConfirmedAt: new Date() },
    });
  }

  private async withPresignedPoster<T extends { posterFileUrl: string | null; installPhotoUrl?: string | null; removalPhotoUrl?: string | null }>(
    reservation: T,
  ) {
    const [posterUrl, installPhotoUrl, removalPhotoUrl] = await Promise.all([
      this.presignIfPresent(reservation.posterFileUrl),
      this.presignIfPresent(reservation.installPhotoUrl),
      this.presignIfPresent(reservation.removalPhotoUrl),
    ]);
    return { ...reservation, posterUrl, installPhotoUrl, removalPhotoUrl };
  }

  private async presignIfPresent(fileUrl: string | null | undefined): Promise<string | null> {
    if (!fileUrl) return null;
    return this.storage.getPresignedReadUrl(this.storage.getKeyFromFileUrl(fileUrl), 3600);
  }
}
