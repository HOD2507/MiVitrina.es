import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";
import { AjustesClient } from "./ajustes-client";

/**
 * Réglages du compte (nom, téléphone, email en lecture seule) — distinct
 * des réglages du commerce/de la société ("Mi escaparate"), qui restent
 * là où ils étaient. Commun aux deux rôles (comerciante/anunciante).
 */
export default async function AjustesPage() {
  const locale = await getLocale();
  const t = await getTranslations("Ajustes");
  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");

  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <AjustesClient user={user as AuthUser} />
    </div>
  );
}
