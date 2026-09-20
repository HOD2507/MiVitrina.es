"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Eye,
  Ban,
  RotateCcw,
  Trash2,
  BadgeCheck,
  Clock,
  XCircle,
  ShieldOff,
  Loader2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import type { AdminUserListItem } from "@/lib/types";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/icon-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type RoleFilter = "ALL" | typeof UserRole.COMMERCANT | typeof UserRole.ANNONCEUR;
type StatusFilter = "ALL" | "SUSPENDED" | VerificationStatus;
type DialogKind = "suspend" | "reactivate" | "delete";
type DialogState = { type: DialogKind; user: AdminUserListItem } | null;


export function UsersClient({ initialUsers }: { initialUsers: AdminUserListItem[] }) {
  const t = useTranslations("Admin.users");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (role !== "ALL") params.set("role", role);
    if (status !== "ALL") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        setUsers(await api.get<AdminUserListItem[]>(`/admin/users?${params.toString()}`));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("loadError"));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, search]);

  function openDialog(type: DialogKind, user: AdminUserListItem) {
    setDialog({ type, user });
    setReason("");
  }

  async function confirmAction() {
    if (!dialog) return;
    setSubmitting(true);
    try {
      if (dialog.type === "delete") {
        await api.delete(`/admin/users/${dialog.user.id}`);
        setUsers((prev) => prev.filter((u) => u.id !== dialog.user.id));
        toast.success(t("deleteSuccess"));
      } else {
        const suspended = dialog.type === "suspend";
        const updated = await api.patch<{ suspended: boolean }>(`/admin/users/${dialog.user.id}/suspend`, {
          suspended,
          reason: suspended ? reason : undefined,
        });
        setUsers((prev) => prev.map((u) => (u.id === dialog.user.id ? { ...u, suspended: updated.suspended } : u)));
        toast.success(suspended ? t("suspendSuccess") : t("reactivateSuccess"));
      }
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  const roleLabel = useMemo(
    () => ({
      [UserRole.COMMERCANT]: t("filterRoleCommercant"),
      [UserRole.ANNONCEUR]: t("filterRoleAnnonceur"),
    }),
    [t],
  );

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <IconInput
            icon={Search}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={role} onValueChange={(v) => v && setRole(v as RoleFilter)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue>
                {(v: string) =>
                  v === "ALL" ? t("filterRoleAll") : roleLabel[v as typeof UserRole.COMMERCANT | typeof UserRole.ANNONCEUR]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filterRoleAll")}</SelectItem>
              <SelectItem value={UserRole.COMMERCANT}>{t("filterRoleCommercant")}</SelectItem>
              <SelectItem value={UserRole.ANNONCEUR}>{t("filterRoleAnnonceur")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue>
                {(v: string) =>
                  ({
                    ALL: t("filterStatusAll"),
                    SUSPENDED: t("filterStatusSuspended"),
                    [VerificationStatus.VERIFIED]: t("filterStatusVerified"),
                    [VerificationStatus.PENDING]: t("filterStatusPending"),
                    [VerificationStatus.REJECTED]: t("filterStatusRejected"),
                  })[v]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filterStatusAll")}</SelectItem>
              <SelectItem value="SUSPENDED">{t("filterStatusSuspended")}</SelectItem>
              <SelectItem value={VerificationStatus.VERIFIED}>{t("filterStatusVerified")}</SelectItem>
              <SelectItem value={VerificationStatus.PENDING}>{t("filterStatusPending")}</SelectItem>
              <SelectItem value={VerificationStatus.REJECTED}>{t("filterStatusRejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <Card className="overflow-hidden p-0 shadow-sm">
          {loading && (
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> ...
            </div>
          )}
          {users.length === 0 ? (
            <EmptyState icon={Search} title={t("emptyTitle")} className="py-12" />
          ) : (
            // `scroll-shadows-x` : ombre au bord dès qu'il reste des colonnes à faire défiler (mobile),
            // voir globals.css — sans elle, Tipo/Estado/Acciones étaient cachées sans aucune indication.
            <div className="scroll-shadows-x overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{t("tableName")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableEmail")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableType")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableRegistered")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableStatus")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("tableActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-muted/40">
                      {/* Nom tronqué avec « … » (nom complet au survol / lecteur d'écran) au lieu d'un retour à la
                          ligne mot par mot. Sous `lg` l'email reste sur une ligne et la table défile horizontalement (avec
                          ombre) ; sur ordinateur, où la place ne manque pas, il passe à la ligne comme avant. */}
                      <td className="px-4 py-3 font-medium">
                        <span className="block max-w-[11rem] truncate lg:max-w-[14rem]" title={u.displayName ?? u.name ?? undefined}>
                          {u.displayName ?? u.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground lg:whitespace-normal">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{roleLabel[u.role as typeof UserRole.COMMERCANT | typeof UserRole.ANNONCEUR]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString(dateLocale)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge user={u} t={t} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label={t("viewDetail")} render={<Link href={`/admin/users/${u.id}`} />}>
                            <Eye className="size-4" />
                          </Button>
                          {u.suspended ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                             
                              aria-label={t("reactivate")}
                              onClick={() => openDialog("reactivate", u)}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : (
                            <Button size="icon-sm" variant="ghost" aria-label={t("suspend")} onClick={() => openDialog("suspend", u)}>
                              <Ban className="size-4" />
                            </Button>
                          )}
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("delete")}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => openDialog("delete", u)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Reveal>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === "suspend" && t("confirmSuspendTitle")}
              {dialog?.type === "reactivate" && t("confirmReactivateTitle")}
              {dialog?.type === "delete" && t("confirmDeleteTitle")}
            </DialogTitle>
            <DialogDescription>
              {dialog?.type === "suspend" && t("confirmSuspendDesc")}
              {dialog?.type === "reactivate" && t("confirmReactivateDesc")}
              {dialog?.type === "delete" && t("confirmDeleteDesc")}
            </DialogDescription>
          </DialogHeader>

          {dialog?.type === "suspend" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">{t("reasonLabel")}</Label>
              <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
            </div>
          )}

          <DialogFooter>
            <Button
              variant={dialog?.type === "delete" ? "destructive" : "default"}
              disabled={submitting || (dialog?.type === "suspend" && !reason.trim())}
              onClick={confirmAction}
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {dialog?.type === "suspend" && t("confirmSuspendCta")}
              {dialog?.type === "reactivate" && t("confirmReactivateCta")}
              {dialog?.type === "delete" && t("confirmDeleteCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ user, t }: { user: AdminUserListItem; t: ReturnType<typeof useTranslations> }) {
  if (user.suspended) {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldOff className="size-3.5" /> {t("statusSuspended")}
      </Badge>
    );
  }
  if (user.verificationStatus === VerificationStatus.VERIFIED) {
    return (
      <Badge variant="success" className="gap-1">
        <BadgeCheck className="size-3.5" /> {t("statusVerified")}
      </Badge>
    );
  }
  if (user.verificationStatus === VerificationStatus.PENDING) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="size-3.5" /> {t("statusPending")}
      </Badge>
    );
  }
  if (user.verificationStatus === VerificationStatus.REJECTED) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3.5" /> {t("statusRejected")}
      </Badge>
    );
  }
  return <Badge variant="outline">{t("statusActive")}</Badge>;
}
