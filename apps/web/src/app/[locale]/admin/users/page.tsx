import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { AdminUserListItem } from "@/lib/types";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  // Les deux fetch partent en parallèle (aucun `await` avant) plutôt qu'en
  // cascade — voir admin-guard.ts.
  const userPromise = getAdminUser();
  const usersPromise = serverApiGet<AdminUserListItem[]>("/admin/users");

  await requireAdminPermission(userPromise, AdminPermission.USERS_VIEW);
  const { data: users } = await usersPromise;

  return <UsersClient initialUsers={users ?? []} />;
}
