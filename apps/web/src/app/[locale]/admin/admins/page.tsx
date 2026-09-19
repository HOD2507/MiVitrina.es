import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { AdminAccountListItem } from "@/lib/types";
import { AdminsClient } from "./admins-client";

export default async function AdminAdminsPage() {
  const userPromise = getAdminUser();
  const adminsPromise = serverApiGet<AdminAccountListItem[]>("/admin/admins");

  const currentUser = await requireAdminPermission(userPromise, AdminPermission.ADMINS_MANAGE);
  const { data: admins } = await adminsPromise;

  return <AdminsClient initialAdmins={admins ?? []} currentUserId={currentUser.id} />;
}
