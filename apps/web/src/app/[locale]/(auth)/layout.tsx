import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

/** Layout partagé pour les pages d'auth (login/register) : carte centrée. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">{children}</main>
    </div>
  );
}
