import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { AuditLogEntry } from "@/lib/types";
import { AuditLogClient } from "./audit-log-client";

export default async function AdminAuditLogPage() {
  const userPromise = getAdminUser();
  const entriesPromise = serverApiGet<AuditLogEntry[]>("/admin/audit-log");

  await requireAdminPermission(userPromise, AdminPermission.ADMINS_MANAGE);
  const { data: entries } = await entriesPromise;

  return <AuditLogClient initialEntries={entries ?? []} />;
}
