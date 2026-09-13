import type { ReactNode } from "react";

/** Layout partagé pour les pages d'auth (login/register) : carte centrée. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border border-gray-200 p-8 shadow-sm">{children}</div>
    </main>
  );
}
