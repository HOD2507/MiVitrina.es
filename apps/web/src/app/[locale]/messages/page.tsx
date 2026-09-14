import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, ChatThreadSummary } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { MessagesClient } from "./messages-client";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const locale = await getLocale();
  const params = await searchParams;

  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");
  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  const authedUser = user as AuthUser;

  const { data: threads } = await serverApiGet<ChatThreadSummary[]>("/chat/threads");

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Messages</h1>
        <MessagesClient
          initialThreads={threads ?? []}
          initialThreadId={params.thread ?? null}
          currentUserId={authedUser.id}
        />
      </main>
    </div>
  );
}
