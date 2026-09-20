import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Prisma } from "@mivitrina/database";
import {
  AdminAuditAction,
  AdminLevel,
  DisputeStatus,
  ReservationStatus,
  TransactionStatus,
  UserRole,
  VerificationStatus,
} from "@mivitrina/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { StripeService } from "../stripe/stripe.service";
import { AuthUserCacheService } from "../auth/auth-user-cache.service";
import { ReviewVerificationDto } from "./dto/review-verification.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { ResolveDisputeDto } from "./dto/resolve-dispute.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { SuspendUserDto } from "./dto/suspend-user.dto";
import { ListReservationsQueryDto } from "./dto/list-reservations-query.dto";
import { ForceRefundDto } from "./dto/force-refund.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminLevelDto } from "./dto/update-admin-level.dto";
import { ListAuditLogQueryDto } from "./dto/list-audit-log-query.dto";

/** Même valeur que dans AuthService — pas de constante partagée pour un seul chiffre utilisé à deux endroits distincts. */
const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly stripe: StripeService,
    private readonly userCache: AuthUserCacheService,
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
  // Journal d'audit
  // ---------------------------------------------------------------------

  /** Trace toute action admin sensible — "traçabilité si algo se cuestiona después" (demande explicite). */
  private async logAction(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    targetLabel?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { email: true } });
    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminEmail: admin?.email ?? "?",
        action,
        targetType,
        targetId,
        targetLabel: targetLabel ?? null,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Lecture seule, volontairement : aucune méthode d'update/delete n'existe
   * sur AuditLog dans tout ce service — la valeur de preuve du journal
   * dépend justement du fait que personne, pas même un SUPERADMIN, ne
   * puisse l'altérer après coup (demande explicite).
   */
  async listAuditLog(query: ListAuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.adminEmail) {
      where.adminEmail = { contains: query.adminEmail, mode: "insensitive" };
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        // Borne "to" inclusive jusqu'à la fin de la journée si seule une date (sans heure) est fournie.
        ...(query.to ? { lte: query.to.length <= 10 ? new Date(`${query.to}T23:59:59.999`) : new Date(query.to) } : {}),
      };
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(query.limit ?? 100, 500),
    });
  }

  // ---------------------------------------------------------------------
  // Gestion des utilisateurs
  // ---------------------------------------------------------------------

  async listUsers(query: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: query.role ?? { in: [UserRole.COMMERCANT, UserRole.ANNONCEUR] },
    };

    if (query.status === "SUSPENDED") {
      where.suspended = true;
    } else if (query.status && query.status !== "ALL") {
      // Statut de vérification : n'a de sens que pour un commerçant — un
      // annonceur ne peut simplement jamais matcher, ce qui est correct.
      where.commercantProfile = { is: { verificationStatus: query.status as VerificationStatus } };
    }

    if (query.search) {
      const s = query.search;
      where.OR = [
        { email: { contains: s, mode: "insensitive" } },
        { name: { contains: s, mode: "insensitive" } },
        { commercantProfile: { is: { businessName: { contains: s, mode: "insensitive" } } } },
        { annonceurProfile: { is: { displayName: { contains: s, mode: "insensitive" } } } },
        { annonceurProfile: { is: { companyName: { contains: s, mode: "insensitive" } } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        commercantProfile: { select: { businessName: true, verificationStatus: true } },
        annonceurProfile: { select: { displayName: true, companyName: true } },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      suspended: u.suspended,
      emailVerified: u.emailVerified,
      // Nom sous lequel le compte est connu sur la plateforme : nom du commerce,
      // ou nom PUBLIC de l'annonceur (celui que voient les commerçants), à défaut
      // sa raison sociale. L'email reste un champ à part (`email`) : l'admin voit les deux.
      displayName:
        u.commercantProfile?.businessName ?? u.annonceurProfile?.displayName ?? u.annonceurProfile?.companyName ?? null,
      verificationStatus: u.commercantProfile?.verificationStatus ?? null,
    }));
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        commercantProfile: true,
        annonceurProfile: true,
        disputesRaised: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    let reservations: unknown[] = [];
    if (user.commercantProfile) {
      reservations = await this.prisma.reservation.findMany({
        where: { space: { commercantProfileId: user.commercantProfile.id } },
        include: {
          transaction: true,
          space: { select: { name: true } },
          annonceurProfile: { include: { user: { select: { email: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } else if (user.annonceurProfile) {
      reservations = await this.prisma.reservation.findMany({
        where: { annonceurProfileId: user.annonceurProfile.id },
        include: {
          transaction: true,
          space: { include: { commercantProfile: { select: { businessName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }

    const verificationDocumentReadUrl = user.commercantProfile?.verificationDocumentUrl
      ? await this.storage.getPresignedReadUrl(this.storage.getKeyFromFileUrl(user.commercantProfile.verificationDocumentUrl))
      : null;

    const { passwordHash: _passwordHash, tokenVersion: _tokenVersion, ...safeUser } = user;

    return { ...safeUser, verificationDocumentReadUrl, reservations };
  }

  async suspendUser(adminId: string, id: string, dto: SuspendUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { commercantProfile: true, annonceurProfile: true },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException("Un compte admin ne peut pas être suspendu depuis cet écran.");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        suspended: dto.suspended,
        // N'invalide les sessions actives qu'à la suspension — pas besoin
        // de forcer une reconnexion lors d'une simple réactivation.
        ...(dto.suspended ? { tokenVersion: { increment: 1 } } : {}),
      },
    });

    // Invalidation immédiate (pas d'attente du TTL du cache d'auth) : une
    // suspension doit couper l'accès tout de suite, pas jusqu'à 45s plus
    // tard — voir AuthUserCacheService.
    this.userCache.invalidate(id);

    const label = user.commercantProfile?.businessName ?? user.annonceurProfile?.companyName ?? user.email;
    await this.logAction(
      adminId,
      dto.suspended ? AdminAuditAction.USER_SUSPEND : AdminAuditAction.USER_UNSUSPEND,
      "user",
      id,
      label,
      dto.suspended ? { reason: dto.reason } : undefined,
    );

    return updated;
  }

  /**
   * Suppression réelle — refusée si le compte a un historique de
   * réservations/transactions : mieux vaut suspendre pour garder la trace
   * financière/de preuve en cas de litige ultérieur (demande explicite de
   * l'utilisateur — "más suave que eliminar... sin perder pruebas" décrit
   * exactement pourquoi la suppression ne doit pas être inconditionnelle).
   */
  async deleteUser(adminId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { commercantProfile: true, annonceurProfile: true },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException("Un compte admin ne peut pas être supprimé depuis cet écran.");
    }

    const reservationCount = user.commercantProfile
      ? await this.prisma.reservation.count({ where: { space: { commercantProfileId: user.commercantProfile.id } } })
      : user.annonceurProfile
        ? await this.prisma.reservation.count({ where: { annonceurProfileId: user.annonceurProfile.id } })
        : 0;

    if (reservationCount > 0) {
      throw new BadRequestException(
        "Ce compte a un historique réel de réservations/transactions — suspendez-le plutôt que de le supprimer, pour ne pas perdre de preuve en cas de litige ou de contrôle.",
      );
    }

    const label = user.commercantProfile?.businessName ?? user.annonceurProfile?.companyName ?? user.email;
    await this.prisma.user.delete({ where: { id } });
    this.userCache.invalidate(id);
    await this.logAction(adminId, AdminAuditAction.USER_DELETE, "user", id, label);

    return { ok: true };
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

    const updated = await this.prisma.commercantProfile.update({
      where: { id: commercantProfileId },
      data:
        dto.action === "approve"
          ? { verificationStatus: VerificationStatus.VERIFIED, verificationNote: null }
          : { verificationStatus: VerificationStatus.REJECTED, verificationNote: dto.note },
    });

    await this.logAction(
      adminId,
      AdminAuditAction.VERIFICATION_REVIEW,
      "commercant_profile",
      commercantProfileId,
      profile.businessName,
      { action: dto.action, note: dto.note },
    );

    return updated;
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
    // Valeurs précédentes capturées avant l'upsert, pour que le journal
    // montre un vrai avant/après plutôt que seulement la nouvelle valeur.
    const previous = await this.getSettings();

    const updated = await this.prisma.platformSettings.upsert({
      where: { id: "global" },
      update: { ...dto, updatedById: adminId },
      create: { id: "global", ...dto, updatedById: adminId },
    });
    await this.logAction(adminId, AdminAuditAction.SETTINGS_UPDATE, "platform_settings", "global", null, {
      // Decimal Prisma -> Number : un objet Decimal brut n'est pas garanti
      // sérialisable tel quel dans un champ Json (voir ailleurs dans ce
      // service, ex. getStats()).
      before: { commissionRate: Number(previous.commissionRate), freeCancellationHours: previous.freeCancellationHours },
      after: { ...dto },
    });
    return updated;
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
      include: { reservation: { include: { transaction: true, space: { include: { commercantProfile: true } } } } },
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
    // commerçant reste à faire manuellement par l'admin le cas échéant.
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

    const resolved = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.outcome,
        resolution: dto.resolution,
        resolvedById: adminId,
        resolvedAt: new Date(),
        refundAmount: dto.refundAmount ?? null,
      },
    });

    await this.logAction(
      adminId,
      AdminAuditAction.DISPUTE_RESOLVE,
      "dispute",
      disputeId,
      dispute.reservation.space.commercantProfile.businessName,
      { outcome: dto.outcome, resolution: dto.resolution, refundAmount: dto.refundAmount, nextStatus: dto.nextStatus },
    );

    return resolved;
  }

  // ---------------------------------------------------------------------
  // Supervision des réservations/transactions
  // ---------------------------------------------------------------------

  async listReservations(query: ListReservationsQueryDto) {
    const where: Prisma.ReservationWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { space: { commercantProfile: { is: { businessName: { contains: s, mode: "insensitive" } } } } },
        { annonceurProfile: { is: { companyName: { contains: s, mode: "insensitive" } } } },
        { annonceurProfile: { is: { user: { is: { email: { contains: s, mode: "insensitive" } } } } } },
      ];
    }

    return this.prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        space: { include: { commercantProfile: { select: { businessName: true } } } },
        annonceurProfile: { include: { user: { select: { email: true } } } },
        transaction: true,
      },
    });
  }

  async getReservationDetail(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        space: { include: { commercantProfile: true } },
        annonceurProfile: { include: { user: { select: { email: true } } } },
        transaction: { include: { invoices: true } },
        disputes: true,
      },
    });
    if (!reservation) {
      throw new NotFoundException("Réservation introuvable.");
    }
    return reservation;
  }

  /** Remboursement forcé indépendant d'un litige formel — demande explicite ("no solo verlo"). */
  async forceRefund(adminId: string, reservationId: string, dto: ForceRefundDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { transaction: true, space: { include: { commercantProfile: true } } },
    });
    if (!reservation) {
      throw new NotFoundException("Réservation introuvable.");
    }
    const { transaction } = reservation;
    if (!transaction) {
      throw new BadRequestException("Réservation sans transaction associée.");
    }
    if (transaction.status !== TransactionStatus.PAID && transaction.status !== TransactionStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestException("Cette transaction n'a pas été payée — rien à rembourser.");
    }
    if (!transaction.stripePaymentIntentId) {
      throw new BadRequestException("Aucun paiement Stripe associé à cette transaction.");
    }

    const alreadyRefunded = Number(transaction.refundedAmount);
    const totalRefunded = alreadyRefunded + dto.amount;
    if (totalRefunded > Number(transaction.amount)) {
      throw new BadRequestException("Le montant remboursé dépasserait le montant payé.");
    }

    await this.stripe.refund(transaction.stripePaymentIntentId, Math.round(dto.amount * 100));

    const updated = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        refundedAmount: totalRefunded,
        status: totalRefunded >= Number(transaction.amount) ? TransactionStatus.REFUNDED : TransactionStatus.PARTIALLY_REFUNDED,
      },
    });

    await this.logAction(
      adminId,
      AdminAuditAction.RESERVATION_FORCE_REFUND,
      "reservation",
      reservationId,
      reservation.space.commercantProfile.businessName,
      { amount: dto.amount, reason: dto.reason },
    );

    return updated;
  }

  // ---------------------------------------------------------------------
  // Gestion des comptes admin (sous-rôles — voir AdminLevel/AdminPermission)
  // ---------------------------------------------------------------------

  async listAdmins() {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, adminLevel: true, createdAt: true, lastLoginAt: true },
    });
    return admins;
  }

  /** Création d'un compte admin par un autre admin (ADMINS_MANAGE) — pas d'auto-inscription possible. */
  async createAdmin(creatorAdminId: string, dto: CreateAdminDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Un compte existe déjà avec cet email.");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: UserRole.ADMIN,
        adminLevel: dto.adminLevel,
        // Créé directement par un admin de confiance : pas de boucle de
        // vérification d'email à faire passer, contrairement à l'inscription publique.
        emailVerified: true,
      },
      select: { id: true, email: true, adminLevel: true, createdAt: true },
    });

    await this.logAction(creatorAdminId, AdminAuditAction.ADMIN_CREATE, "user", created.id, created.email, {
      adminLevel: dto.adminLevel,
    });

    return created;
  }

  /**
   * Changement de périmètre d'un admin existant — un admin ne peut pas
   * modifier son propre niveau (évite de se retirer accidentellement
   * ADMINS_MANAGE et de se verrouiller hors de la gestion des admins).
   */
  async updateAdminLevel(actingAdminId: string, targetId: string, dto: UpdateAdminLevelDto) {
    if (targetId === actingAdminId) {
      throw new BadRequestException("Vous ne pouvez pas modifier votre propre niveau d'accès.");
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target || target.role !== UserRole.ADMIN) {
      throw new NotFoundException("Administrateur introuvable.");
    }

    const previousLevel = target.adminLevel;

    if (previousLevel === AdminLevel.SUPERADMIN && dto.adminLevel !== AdminLevel.SUPERADMIN) {
      const remainingSuperadmins = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, adminLevel: AdminLevel.SUPERADMIN, id: { not: targetId } },
      });
      if (remainingSuperadmins === 0) {
        throw new BadRequestException(
          "Impossible de retirer le niveau Superadmin au dernier compte qui le détient — créez d'abord un autre Superadmin.",
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { adminLevel: dto.adminLevel },
      select: { id: true, email: true, adminLevel: true },
    });
    // Sans ça, l'admin dont le niveau vient de changer garderait ses
    // anciennes permissions jusqu'à 45s (TTL du cache) — inacceptable pour
    // un changement de périmètre décidé depuis ce panel.
    this.userCache.invalidate(targetId);

    await this.logAction(actingAdminId, AdminAuditAction.ADMIN_UPDATE_LEVEL, "user", targetId, updated.email, {
      previousLevel,
      newLevel: dto.adminLevel,
    });

    return updated;
  }

  /**
   * Suppression d'un compte admin — distincte de deleteUser() (qui refuse
   * tout compte ADMIN) : ici volontairement permise, mais jamais pour son
   * propre compte ni pour le dernier Superadmin restant (sans quoi plus
   * personne ne pourrait gérer les admins).
   */
  async deleteAdmin(actingAdminId: string, targetId: string) {
    if (targetId === actingAdminId) {
      throw new BadRequestException("Vous ne pouvez pas supprimer votre propre compte.");
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target || target.role !== UserRole.ADMIN) {
      throw new NotFoundException("Administrateur introuvable.");
    }

    if (target.adminLevel === AdminLevel.SUPERADMIN) {
      const remainingSuperadmins = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, adminLevel: AdminLevel.SUPERADMIN, id: { not: targetId } },
      });
      if (remainingSuperadmins === 0) {
        throw new BadRequestException("Impossible de supprimer le dernier compte Superadmin.");
      }
    }

    await this.prisma.user.delete({ where: { id: targetId } });
    // Une session déjà ouverte de ce compte supprimé ne doit pas pouvoir
    // continuer à passer les requêtes authentifiées jusqu'à expiration du
    // TTL du cache.
    this.userCache.invalidate(targetId);
    await this.logAction(actingAdminId, AdminAuditAction.ADMIN_DELETE, "user", targetId, target.email, {
      adminLevel: target.adminLevel,
    });

    return { ok: true };
  }
}
