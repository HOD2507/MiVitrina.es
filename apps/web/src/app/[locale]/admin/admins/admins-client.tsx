"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { Plus, ShieldUser, Loader2, ShieldCheck, Headset, Wallet, Pencil, Trash2 } from "lucide-react";
import { AdminLevel } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import { getDateLocale } from "@/lib/date-locale";
import type { AdminAccountListItem } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Reveal } from "@/components/reveal";

const LEVEL_ICON: Record<AdminLevel, typeof ShieldCheck> = {
  [AdminLevel.SUPERADMIN]: ShieldCheck,
  [AdminLevel.SUPPORT]: Headset,
  [AdminLevel.FINANCE]: Wallet,
};

const LEVEL_BADGE_VARIANT: Record<AdminLevel, "default" | "outline" | "warning"> = {
  [AdminLevel.SUPERADMIN]: "default",
  [AdminLevel.SUPPORT]: "outline",
  [AdminLevel.FINANCE]: "warning",
};

/** Sélecteur des 3 niveaux, partagé entre le dialogue de création et celui d'édition. */
function LevelPicker({ value, onChange, t }: { value: AdminLevel; onChange: (l: AdminLevel) => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col gap-2">
      {Object.values(AdminLevel).map((l) => {
        const Icon = LEVEL_ICON[l];
        const active = value === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
              active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <span
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium">{t(`level.${l}.name`)}</span>
              <span className="block text-xs text-muted-foreground">{t(`level.${l}.description`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type ActionDialog = { type: "edit" | "delete"; admin: AdminAccountListItem } | null;

export function AdminsClient({
  initialAdmins,
  currentUserId,
}: {
  initialAdmins: AdminAccountListItem[];
  currentUserId: string;
}) {
  const t = useTranslations("Admin.admins");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const [admins, setAdmins] = useState(initialAdmins);
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<AdminLevel>(AdminLevel.SUPPORT);
  const [submitting, setSubmitting] = useState(false);

  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [editLevel, setEditLevel] = useState<AdminLevel>(AdminLevel.SUPPORT);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const levelLabel = (l: AdminLevel) => t(`level.${l}.name`);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.post<{ id: string; email: string; adminLevel: AdminLevel; createdAt: string }>(
        "/admin/admins",
        { email, password, adminLevel: level },
      );
      setAdmins((prev) => [
        ...prev,
        { id: created.id, email: created.email, name: null, adminLevel: created.adminLevel, createdAt: created.createdAt, lastLoginAt: null },
      ]);
      toast.success(t("createSuccess"));
      setCreateOpen(false);
      setEmail("");
      setPassword("");
      setLevel(AdminLevel.SUPPORT);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("createError"));
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(admin: AdminAccountListItem) {
    setEditLevel(admin.adminLevel ?? AdminLevel.SUPPORT);
    setDialog({ type: "edit", admin });
  }

  async function confirmEdit() {
    if (!dialog) return;
    setActionSubmitting(true);
    try {
      const updated = await api.patch<{ id: string; adminLevel: AdminLevel }>(`/admin/admins/${dialog.admin.id}`, {
        adminLevel: editLevel,
      });
      setAdmins((prev) => prev.map((a) => (a.id === updated.id ? { ...a, adminLevel: updated.adminLevel } : a)));
      toast.success(t("updateLevelSuccess"));
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateLevelError"));
    } finally {
      setActionSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!dialog) return;
    setActionSubmitting(true);
    try {
      await api.delete(`/admin/admins/${dialog.admin.id}`);
      setAdmins((prev) => prev.filter((a) => a.id !== dialog.admin.id));
      toast.success(t("deleteSuccess"));
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("deleteError"));
    } finally {
      setActionSubmitting(false);
    }
  }

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {/* text-3xl sous `sm` : « Administradores » est un seul mot qu'on ne peut pas couper — à 36px il dépassait 320px. */}
            <h1 className="flex items-center gap-2.5 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              <ShieldUser className="size-8 text-primary" />
              {t("title")}
            </h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="size-4" />
                  {t("createCta")}
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>{t("createTitle")}</DialogTitle>
                  <DialogDescription>{t("createDescription")}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="admin-email">{t("emailLabel")}</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="admin-password">{t("passwordLabel")}</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      minLength={8}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>{t("levelLabel")}</Label>
                    <LevelPicker value={level} onChange={setLevel} t={t} />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="size-3.5 animate-spin" />}
                    {t("createCta")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <Card className="overflow-hidden p-0 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("tableEmail")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableLevel")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableCreated")}</th>
                  <th className="px-4 py-3 font-medium">{t("tableLastLogin")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("tableActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((a) => {
                  const isSelf = a.id === currentUserId;
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">
                        {a.email}
                        {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">({t("you")})</span>}
                      </td>
                      <td className="px-4 py-3">
                        {a.adminLevel && (
                          <Badge variant={LEVEL_BADGE_VARIANT[a.adminLevel]} className="gap-1">
                            {levelLabel(a.adminLevel)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString(dateLocale)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString(dateLocale) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("editLevel")}
                            title={isSelf ? t("cannotEditSelf") : t("editLevel")}
                            disabled={isSelf}
                            onClick={() => openEdit(a)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("delete")}
                            title={isSelf ? t("cannotDeleteSelf") : t("delete")}
                            disabled={isSelf}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDialog({ type: "delete", admin: a })}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      {/* Édition du niveau */}
      <Dialog open={dialog?.type === "edit"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editLevelTitle")}</DialogTitle>
            <DialogDescription>{dialog?.admin.email}</DialogDescription>
          </DialogHeader>
          <LevelPicker value={editLevel} onChange={setEditLevel} t={t} />
          <DialogFooter>
            <Button disabled={actionSubmitting} onClick={confirmEdit}>
              {actionSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {t("editLevelCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression */}
      <Dialog open={dialog?.type === "delete"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>{t("confirmDeleteDesc", { email: dialog?.admin.email ?? "" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" disabled={actionSubmitting} onClick={confirmDelete}>
              {actionSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {t("confirmDeleteCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
