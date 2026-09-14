import { serverApiGet } from "@/lib/api-server";
import type { PlatformSettings } from "@/lib/types";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const { data: settings } = await serverApiGet<PlatformSettings>("/admin/settings");

  if (!settings) {
    return <p className="text-muted-foreground">Impossible de charger les réglages.</p>;
  }

  return <SettingsClient initialSettings={settings} />;
}
