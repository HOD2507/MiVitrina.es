"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/icon-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound, User, Phone, Mail } from "lucide-react";

const ROLE_LABEL_KEY: Record<string, string> = {
  [UserRole.COMMERCANT]: "roleCommercant",
  [UserRole.ANNONCEUR]: "roleAnnonceur",
};

export function AjustesClient({ user }: { user: AuthUser }) {
  const t = useTranslations("Ajustes");
  const tShell = useTranslations("AppShell");
  const tErrors = useTranslations("Auth.errors");

  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/auth/me", { name: name || undefined, phone: phone || undefined });
      toast.success(t("saveSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("accountTitle")}</CardTitle>
          <CardDescription>{t("accountDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <IconInput
              icon={User}
              id="name"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">{t("phoneLabel")}</Label>
            <IconInput
              icon={Phone}
              id="phone"
              type="tel"
              placeholder={t("phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <IconInput icon={Mail} id="email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">{t("emailReadOnlyHint")}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("accountTypeLabel")}</span>
            <Badge variant="secondary">{tShell(ROLE_LABEL_KEY[user.role] ?? "roleCommercant")}</Badge>
          </div>

          <Button size="sm" className="self-start" onClick={handleSave} disabled={saving}>
            {t("save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="size-4.5" />
            {t("passwordTitle")}
          </CardTitle>
          <CardDescription>{t("passwordDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" render={<Link href="/forgot-password" />}>
            {t("changePassword")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
