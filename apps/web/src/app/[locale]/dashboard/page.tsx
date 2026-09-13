import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole, VerificationStatus } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "./logout-button";

/**
 * Dashboard générique post-connexion — placeholder en attendant les
 * dashboards dédiés par rôle (ADMIN/ANNONCEUR/COMMERCANT) à l'étape "pages".
 * Protection : Server Component, redirige vers /login si /auth/me échoue.
 */
export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");

  if (status === 401 || !user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  const authedUser = user as AuthUser;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">{t("welcome", { email: authedUser.email })}</h1>
          <p className="text-gray-600">{t("role", { role: authedUser.role })}</p>
        </div>
        <LogoutButton />
      </div>

      {!authedUser.emailVerified && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("emailNotVerified")}</p>
      )}

      {authedUser.role === UserRole.COMMERCANT &&
        authedUser.commercantProfile?.verificationStatus === VerificationStatus.PENDING && (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("verificationPending")}</p>
        )}
    </main>
  );
}
