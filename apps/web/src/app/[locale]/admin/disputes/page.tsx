import { serverApiGet } from "@/lib/api-server";
import type { AdminDispute } from "@/lib/types";
import { DisputesClient } from "./disputes-client";

export default async function AdminDisputesPage() {
  const { data: disputes } = await serverApiGet<AdminDispute[]>("/admin/disputes?status=OPEN");

  return <DisputesClient initialDisputes={disputes ?? []} />;
}
