import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { UserRole } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { AdminNav } from "./admin-nav";

/** Protège toutes les pages /admin/* : réservé au rôle ADMIN. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");

  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  if ((user as AuthUser).role !== UserRole.ADMIN) {
    redirect({ href: "/dashboard", locale });
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <AdminNav />
        </div>
        {children}
      </main>
    </div>
  );
}
