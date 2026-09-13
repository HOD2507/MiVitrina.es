import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, MyVitrine } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { VitrineClient } from "./vitrine-client";

/** Page "Ma vitrine" — réservée aux commerçants (redirige sinon). */
export default async function VitrinePage() {
  const locale = await getLocale();

  const { data: user, status: userStatus } = await serverApiGet<AuthUser>("/auth/me");
  if (userStatus === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  if ((user as AuthUser).role !== UserRole.COMMERCANT) {
    redirect({ href: "/dashboard", locale });
  }

  const { data: vitrine } = await serverApiGet<MyVitrine>("/commercants/me/vitrine");

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <VitrineClient initialVitrine={vitrine} />
      </main>
    </div>
  );
}
