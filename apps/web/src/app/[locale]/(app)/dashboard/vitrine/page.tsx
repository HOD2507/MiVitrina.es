import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, MyVitrine } from "@/lib/types";
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
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <VitrineClient initialVitrine={vitrine} />
    </main>
  );
}
