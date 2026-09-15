import { Controller, Get, NotFoundException } from "@nestjs/common";
import { ReservationStatus, TransactionStatus, UserRole } from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

/** Statuts où de l'argent a réellement été encaissé à un moment donné (même si remboursé depuis). */
const CAPTURED_STATUSES: TransactionStatus[] = [
  TransactionStatus.PAID,
  TransactionStatus.REFUNDED,
  TransactionStatus.PARTIALLY_REFUNDED,
];

@Controller("annonceurs")
@Roles(UserRole.ANNONCEUR)
export class AnnonceursController {
  constructor(private readonly prisma: PrismaService) {}

  /** Indicateurs réels du tableau de bord annonceur — calculés depuis les réservations effectives. */
  @Get("me/stats")
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.annonceurProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      throw new NotFoundException("Profil annonceur introuvable.");
    }

    const [activeCount, pendingCount, completedCount, spendAgg] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          annonceurProfileId: profile.id,
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE] },
        },
      }),
      this.prisma.reservation.count({
        where: { annonceurProfileId: profile.id, status: ReservationStatus.PENDING_VALIDATION },
      }),
      this.prisma.reservation.count({
        where: { annonceurProfileId: profile.id, status: ReservationStatus.COMPLETED },
      }),
      this.prisma.transaction.aggregate({
        where: { reservation: { annonceurProfileId: profile.id }, status: { in: CAPTURED_STATUSES } },
        _sum: { amount: true, refundedAmount: true },
      }),
    ]);

    const gross = Number(spendAgg._sum.amount ?? 0);
    const refunded = Number(spendAgg._sum.refundedAmount ?? 0);

    return {
      activeReservationsCount: activeCount,
      pendingRequestsCount: pendingCount,
      completedReservationsCount: completedCount,
      totalSpent: gross - refunded,
    };
  }
}
