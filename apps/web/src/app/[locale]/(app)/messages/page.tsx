import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { serverApiGet } from "@/lib/api-server";
import type { AuthUser, ChatThreadSummary } from "@/lib/types";
import { Reveal } from "@/components/reveal";
import { MessagesClient } from "./messages-client";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const locale = await getLocale();
  const tShell = await getTranslations("AppShell");
  const params = await searchParams;

  const { data: user, status } = await serverApiGet<AuthUser>("/auth/me");
  if (status === 401 || !user) {
    redirect({ href: "/login", locale });
  }
  const authedUser = user as AuthUser;

  const { data: threads } = await serverApiGet<ChatThreadSummary[]>("/chat/threads");

  return (
    <div className="bg-mesh-panel mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <Reveal>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{tShell("messages")}</h1>
      </Reveal>
      <Reveal delay={80} className="mt-6 block">
        <MessagesClient
          initialThreads={threads ?? []}
          initialThreadId={params.thread ?? null}
          currentUserId={authedUser.id}
        />
      </Reveal>
    </div>
  );
}
