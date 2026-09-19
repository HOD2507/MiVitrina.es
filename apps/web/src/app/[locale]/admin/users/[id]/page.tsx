import { notFound } from "next/navigation";
import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { AdminUserDetail } from "@/lib/types";
import { UserDetailClient } from "./user-detail-client";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Lancé avant tout `await` pour partir en parallèle du fetch de détail
  // ci-dessous plutôt qu'en cascade — voir admin-guard.ts.
  const userPromise = getAdminUser();
  const { id } = await params;
  const detailPromise = serverApiGet<AdminUserDetail>(`/admin/users/${id}`);

  await requireAdminPermission(userPromise, AdminPermission.USERS_VIEW);
  const { data: user, status } = await detailPromise;

  if (status === 404 || !user) {
    notFound();
  }

  return <UserDetailClient initialUser={user} />;
}
