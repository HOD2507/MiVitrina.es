"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getAnnonceurDisplayName, isValidAnnonceurDisplayName, UserRole, ANNONCEUR_DISPLAY_NAME_MAX_LENGTH, ANNONCEUR_DISPLAY_NAME_MIN_LENGTH } from "@mivitrina/shared";
import { api, ApiError } from "@/lib/api-client";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/icon-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound, User, UserRound, Phone, Mail } from "lucide-react";
import { AvatarUploader } from "./avatar-uploader";

const ROLE_LABEL_KEY: Record<string, string> = {
  [UserRole.COMMERCANT]: "roleCommercant",
  [UserRole.ANNONCEUR]: "roleAnnonceur",
};

export function AjustesClient({ user }: { user: AuthUser }) {
  const t = useTranslations("Ajustes");
  const tShell = useTranslations("AppShell");
  const tErrors = useTranslations("Auth.errors");
  const locale = useLocale();
  const isAnnonceur = user.role === UserRole.ANNONCEUR;

  // Nombre público (solo anunciantes): lo único que ven los comerciantes.
  const [publicName, setPublicName] = useState(user.annonceurProfile?.displayName ?? "");
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    // Un nombre público a medias (o con @) se rechaza aquí, con mensaje localizado, antes de llamar a la API.
    if (isAnnonceur && publicName.trim() && !isValidAnnonceurDisplayName(publicName)) {
      toast.error(t("publicNameInvalid"));
      return;
    }

    setSaving(true);
    try {
      await api.patch("/auth/me", {
        name: name || undefined,
        phone: phone || undefined,
        displayName: isAnnonceur && publicName.trim() ? publicName.trim() : undefined,
      });
      toast.success(t("saveSuccess"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tErrors("generic"));
    } finally {
      setSaving(false);
    }
  }

  // Iniciales/alt de la foto: el nombre público del anunciante, nunca su email.
  const avatarName = getAnnonceurDisplayName(
    { displayName: publicName.trim() || user.annonceurProfile?.displayName, companyName: user.annonceurProfile?.companyName },
    locale,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* La foto solo tiene sentido para el anunciante: es lo que ve el comerciante en sus solicitudes. */}
      {user.role === UserRole.ANNONCEUR && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("avatarTitle")}</CardTitle>
            <CardDescription>{t("avatarDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUploader user={user} displayName={avatarName} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("accountTitle")}</CardTitle>
          <CardDescription>{t("accountDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isAnnonceur && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="publicName">{t("publicNameLabel")}</Label>
              <IconInput
                icon={UserRound}
                id="publicName"
                autoComplete="nickname"
                placeholder={t("publicNamePlaceholder")}
                minLength={ANNONCEUR_DISPLAY_NAME_MIN_LENGTH}
                maxLength={ANNONCEUR_DISPLAY_NAME_MAX_LENGTH}
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("publicNameHint")}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <IconInput
              icon={User}
              id="name"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {isAnnonceur && <p className="text-xs text-muted-foreground">{t("nameHintPrivate")}</p>}
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
