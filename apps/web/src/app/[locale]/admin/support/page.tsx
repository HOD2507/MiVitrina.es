import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { AdminSupportInbox } from "@/lib/types";
import { SupportInboxClient } from "./support-inbox-client";

export default async function AdminSupportPage() {
  const userPromise = getAdminUser();
  const inboxPromise = serverApiGet<AdminSupportInbox>("/admin/support/tickets");

  await requireAdminPermission(userPromise, AdminPermission.SUPPORT_MANAGE);
  const { data: inbox } = await inboxPromise;

  return (
    <SupportInboxClient
      initialInbox={inbox ?? { counts: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 }, tickets: [] }}
    />
  );
}
