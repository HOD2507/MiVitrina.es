"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import {
  Ban,
  RotateCcw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  CreditCard,
  ShieldOff,
  BadgeCheck,
  Clock,
  Loader2,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { BackLink } from "@/components/back-link";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import type { AdminUserDetail } from "@/lib/types";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";

type DialogKind = "suspend" | "reactivate" | "delete" | "reject";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function UserDetailClient({ initialUser }: { initialUser: AdminUserDetail }) {
  const t = useTranslations("Admin.userDetail");
  const tUsers = useTranslations("Admin.users");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const router = useRouter();

  const [user, setUser] = useState(initialUser);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Título: nombre del comercio o nombre PÚBLICO del anunciante (el que ven los comerciantes);
  // el email va siempre debajo, así que el admin ve los dos a la vez.
  const displayName =
    user.commercantProfile?.businessName ??
    user.annonceurProfile?.displayName ??
    user.annonceurProfile?.companyName ??
    user.name ??
    user.email;

  async function handleSuspendToggle(suspended: boolean) {
    setSubmitting(true);
    try {
      const updated = await api.patch<{ suspended: boolean }>(`/admin/users/${user.id}/suspend`, {
        suspended,
        reason: suspended ? reason : undefined,
      });
      setUser((prev) => ({ ...prev, suspended: updated.suspended }));
      toast.success(suspended ? tUsers("suspendSuccess") : tUsers("reactivateSuccess"));
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast.success(tUsers("deleteSuccess"));
      router.push("/admin/users");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tUsers("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproveVerification() {
    if (!user.commercantProfile) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/commercants/${user.commercantProfile.id}/verification`, { action: "approve" });
      setUser((prev) =>
        prev.commercantProfile
          ? { ...prev, commercantProfile: { ...prev.commercantProfile, verificationStatus: VerificationStatus.VERIFIED } }
          : prev,
      );
      toast.success(t("approveSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectVerification() {
    if (!user.commercantProfile) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/commercants/${user.commercantProfile.id}/verification`, { action: "reject", note: reason });
      setUser((prev) =>
        prev.commercantProfile
          ? {
              ...prev,
              commercantProfile: {
                ...prev.commercantProfile,
                verificationStatus: VerificationStatus.REJECTED,
                verificationNote: reason,
              },
            }
          : prev,
      );
      toast.success(t("rejectSuccess"));
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  const profile = user.commercantProfile;

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <BackLink href="/admin/users" label={t("back")} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-4xl font-extrabold tracking-tight">{displayName}</h1>
            {user.suspended && (
              <Badge variant="destructive" className="gap-1">
                <ShieldOff className="size-3.5" /> {tUsers("statusSuspended")}
              </Badge>
            )}
            {profile?.verificationStatus === VerificationStatus.VERIFIED && (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="size-3.5" /> {tUsers("statusVerified")}
              </Badge>
            )}
            {profile?.verificationStatus === VerificationStatus.PENDING && (
              <Badge variant="warning" className="gap-1">
                <Clock className="size-3.5" /> {tUsers("statusPending")}
              </Badge>
            )}
            {profile?.verificationStatus === VerificationStatus.REJECTED && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="size-3.5" /> {tUsers("statusRejected")}
              </Badge>
            )}
          </div>
          {displayName !== user.email && <p className="mt-1.5 text-sm text-muted-foreground">{user.email}</p>}
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="flex flex-wrap gap-2">
          {user.suspended ? (
            <Button size="sm" variant="outline" disabled={submitting} onClick={() => handleSuspendToggle(false)}>
              <RotateCcw className="size-4" /> {tUsers("reactivate")}
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={submitting} onClick={() => setDialog("suspend")}>
              <Ban className="size-4" /> {tUsers("suspend")}
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            disabled={submitting}
            onClick={() => setDialog("delete")}
          >
            <Trash2 className="size-4" /> {tUsers("delete")}
          </Button>
        </div>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal delay={120}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("accountInfoTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border/70">
              {user.annonceurProfile && (
                <InfoRow label={t("publicNameLabel")} value={user.annonceurProfile.displayName || t("notProvided")} />
              )}
              <InfoRow label={t("nameLabel")} value={user.name || t("notProvided")} />
              <InfoRow label={t("emailLabel")} value={user.email} />
              <InfoRow label={t("phoneLabel")} value={user.phone || t("notProvided")} />
              <InfoRow
                label={t("roleLabel")}
                value={user.role === UserRole.COMMERCANT ? tUsers("filterRoleCommercant") : tUsers("filterRoleAnnonceur")}
              />
              <InfoRow label={t("registeredLabel")} value={new Date(user.createdAt).toLocaleDateString(dateLocale)} />
              <InfoRow
                label={t("lastLoginLabel")}
                value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString(dateLocale) : t("neverLoggedIn")}
              />
            </CardContent>
          </Card>
        </Reveal>

        {profile && (
          <Reveal delay={160}>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{t("businessInfoTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border/70">
                <InfoRow label={t("businessNameLabel")} value={profile.businessName} />
                <InfoRow label={t("businessIdLabel")} value={`${profile.businessIdType} ${profile.businessIdNumber}`} />
                <InfoRow label={t("addressLabel")} value={`${profile.addressLine1}, ${profile.postalCode} ${profile.city}`} />
                <InfoRow
                  label={t("stripeStatusLabel")}
                  value={
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="size-3.5" />
                      {profile.stripeOnboardingComplete ? t("stripeConnected") : t("stripeNotConnected")}
                    </span>
                  }
                />
              </CardContent>
              <div className="border-t border-border/70 p-4">
                <p className="mb-2 text-sm font-medium">{t("verificationDocumentTitle")}</p>
                {user.verificationDocumentReadUrl ? (
                  <Button size="sm" variant="outline" render={<a href={user.verificationDocumentReadUrl} target="_blank" rel="noreferrer" />}>
                    <ExternalLink className="size-3.5" /> {t("viewDocument")}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("noDocument")}</p>
                )}
                {profile.verificationStatus !== VerificationStatus.VERIFIED && user.verificationDocumentReadUrl && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" disabled={submitting} onClick={handleApproveVerification}>
                      <CheckCircle2 className="size-3.5" /> {t("approve")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={submitting} onClick={() => setDialog("reject")}>
                      <XCircle className="size-3.5" /> {t("reject")}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </Reveal>
        )}
      </div>

      <Reveal delay={220}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("reservationsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {user.reservations.length === 0 ? (
              <EmptyState icon={Inbox} title={t("noReservations")} className="py-6" />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {user.reservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {new Date(r.startDate).toLocaleDateString(dateLocale)} → {new Date(r.endDate).toLocaleDateString(dateLocale)}
                      </p>
                      {r.transaction && <p className="text-xs text-muted-foreground">{Number(r.transaction.amount).toFixed(2)} €</p>}
                    </div>
                    <Badge variant="outline">{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {user.disputesRaised.length > 0 && (
        <Reveal delay={260}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="size-4.5 text-destructive" />
                {t("disputesTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {user.disputesRaised.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <p>{d.reason}</p>
                  <Badge variant="outline">{d.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Dialog open={dialog === "suspend" || dialog === "delete" || dialog === "reject"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "suspend" && tUsers("confirmSuspendTitle")}
              {dialog === "delete" && tUsers("confirmDeleteTitle")}
              {dialog === "reject" && t("rejectDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {dialog === "suspend" && tUsers("confirmSuspendDesc")}
              {dialog === "delete" && tUsers("confirmDeleteDesc")}
              {dialog === "reject" && t("rejectPlaceholder")}
            </DialogDescription>
          </DialogHeader>

          {(dialog === "suspend" || dialog === "reject") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">{dialog === "suspend" ? tUsers("reasonLabel") : t("rejectDialogTitle")}</Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={dialog === "suspend" ? tUsers("reasonPlaceholder") : t("rejectPlaceholder")}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant={dialog === "delete" ? "destructive" : "default"}
              disabled={submitting || ((dialog === "suspend" || dialog === "reject") && !reason.trim())}
              onClick={() => {
                if (dialog === "suspend") handleSuspendToggle(true);
                else if (dialog === "delete") handleDelete();
                else if (dialog === "reject") handleRejectVerification();
              }}
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {dialog === "suspend" && tUsers("confirmSuspendCta")}
              {dialog === "delete" && tUsers("confirmDeleteCta")}
              {dialog === "reject" && t("confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
