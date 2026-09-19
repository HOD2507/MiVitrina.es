import { getTranslations } from "next-intl/server";
import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { PlatformSettings } from "@/lib/types";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const userPromise = getAdminUser();
  const settingsPromise = serverApiGet<PlatformSettings>("/admin/settings");

  await requireAdminPermission(userPromise, AdminPermission.SETTINGS_MANAGE);
  const { data: settings } = await settingsPromise;

  if (!settings) {
    const t = await getTranslations("Admin.settings");
    return <p className="p-8 text-muted-foreground">{t("loadError")}</p>;
  }

  return <SettingsClient initialSettings={settings} />;
}
