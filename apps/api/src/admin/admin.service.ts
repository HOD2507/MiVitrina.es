import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  DisputeStatus,
  ReservationStatus,
  TransactionStatus,
  UserRole,
  VerificationStatus,
} from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { StripeService } from "../stripe/stripe.service";
import { ReviewVerificationDto } from "./dto/review-verification.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { ResolveDisputeDto } from "./dto/resolve-dispute.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly stripe: StripeService,
  ) {}

  /** Vue d'ensemble pour la page d'accueil du tableau de bord admin. */
  async getStats() {
    const [
      totalCommercants,
      totalAnnonceurs,
      pendingVerifications,
      openDisputes,
      activeReservations,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.COMMERCANT } }),
      this.prisma.user.count({ where: { role: UserRole.ANNONCEUR } }),
      this.prisma.commercantProfile.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
      this.prisma.reservation.count({
        where: { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE] } },
      }),
      this.prisma.transaction.aggregate({
        where: { status: { in: [TransactionStatus.PAID, TransactionStatus.PARTIALLY_REFUNDED] } },
        _sum: { commissionAmount: true },
      }),
    ]);

    return {
      totalCommercants,
      totalAnnonceurs,
      pendingVerifications,
      openDisputes,
      activeReservations,
      totalCommissionRevenue: Number(revenueAgg._sum.commissionAmount ?? 0),
    };
  }

  // ---------------------------------------------------------------------
  // Vérification d'identité commerçant
  // ---------------------------------------------------------------------

  async listPendingVerifications() {
    const profiles = await this.prisma.commercantProfile.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true, createdAt: true } } },
    });

    return Promise.all(
      profiles.map(async (profile) => ({
        id: profile.id,
        businessName: profile.businessName,
        country: profile.country,
        businessIdType: profile.businessIdType,
        businessIdNumber: profile.businessIdNumber,
        city: profile.city,
        email: profile.user.email,
        createdAt: profile.createdAt,
        documentUrl: profile.verificationDocumentUrl
          ? await this.storage.getPresignedReadUrl(this.storage.getKeyFromFileUrl(profile.verificationDocumentUrl))
          : null,
      })),
    );
  }

  async reviewVerification(adminId: string, commercantProfileId: string, dto: ReviewVerificationDto) {
    const profile = await this.prisma.commercantProfile.findUnique({ where: { id: commercantProfileId } });
    if (!profile) {
      throw new NotFoundException("Commerçant introuvable.");
    }

    return this.prisma.commercantProfile.update({
      where: { id: commercantProfileId },
      data:
        dto.action === "approve"
          ? { verificationStatus: VerificationStatus.VERIFIED, verificationNote: null }
          : { verificationStatus: VerificationStatus.REJECTED, verificationNote: dto.note },
    });
  }

  // ---------------------------------------------------------------------
  // Réglages plateforme (commission, délai d'annulation gratuite)
  // ---------------------------------------------------------------------

  async getSettings() {
    return this.prisma.platformSettings.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    });
  }

  async updateSettings(adminId: string, dto: UpdateSettingsDto) {
    return this.prisma.platformSettings.upsert({
      where: { id: "global" },
      update: { ...dto, updatedById: adminId },
      create: { id: "global", ...dto, updatedById: adminId },
    });
  }

  // ---------------------------------------------------------------------
  // Litiges
  // ---------------------------------------------------------------------

  async listDisputes(status?: DisputeStatus) {
    return this.prisma.dispute.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        raisedBy: { select: { email: true, role: true } },
        reservation: {
          include: {
            space: { include: { commercantProfile: { select: { businessName: true } } } },
            annonceurProfile: { include: { user: { select: { email: true } } } },
            transaction: true,
          },
        },
      },
    });
  }

  async resolveDispute(adminId: string, disputeId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { reservation: { include: { transaction: true } } },
    });
    if (!dispute) {
      throw new NotFoundException("Litige introuvable.");
    }
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException("Ce litige a déjà été traité.");
    }

    const { transaction } = dispute.reservation;
    if (!transaction) {
      throw new BadRequestException("Réservation sans transaction associée — incohérence de données.");
    }

    // Remboursement (partiel ou total) à l'annonceur, seulement si de l'argent a réellement été encaissé.
    // NB : le commerçant a pu déjà recevoir un virement séparé à l'approbation de la réservation
    // (voir ReservationsService — modèle "separate charge and transfer") ; ce remboursement ne le
    // récupère pas automatiquement, il ne touche que le solde plateforme. Un ajustement avec le
    // commerçant (ex: déduit d'un prochain virement) reste à faire manuellement par l'admin le cas échéant.
    if (dto.refundAmount && transaction.status === TransactionStatus.PAID && transaction.stripePaymentIntentId) {
      const alreadyRefunded = Number(transaction.refundedAmount);
      const totalRefunded = alreadyRefunded + dto.refundAmount;
      if (totalRefunded > Number(transaction.amount)) {
        throw new BadRequestException("Le montant remboursé dépasserait le montant payé.");
      }

      await this.stripe.refund(transaction.stripePaymentIntentId, Math.round(dto.refundAmount * 100));

      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          refundedAmount: totalRefunded,
          status:
            totalRefunded >= Number(transaction.amount)
              ? TransactionStatus.REFUNDED
              : TransactionStatus.PARTIALLY_REFUNDED,
        },
      });
    }

    await this.prisma.reservation.update({
      where: { id: dispute.reservationId },
      data: { status: dto.nextStatus },
    });

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.outcome,
        resolution: dto.resolution,
        resolvedById: adminId,
        resolvedAt: new Date(),
        refundAmount: dto.refundAmount ?? null,
      },
    });
  }
}
