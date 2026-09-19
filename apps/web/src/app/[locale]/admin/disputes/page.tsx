import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { AdminDispute } from "@/lib/types";
import { DisputesClient } from "./disputes-client";

export default async function AdminDisputesPage() {
  const userPromise = getAdminUser();
  const disputesPromise = serverApiGet<AdminDispute[]>("/admin/disputes?status=OPEN");

  await requireAdminPermission(userPromise, AdminPermission.FINANCE_VIEW);
  const { data: disputes } = await disputesPromise;

  return <DisputesClient initialDisputes={disputes ?? []} />;
}
