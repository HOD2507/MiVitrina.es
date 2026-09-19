import { AdminPermission } from "@mivitrina/shared";
import { serverApiGet } from "@/lib/api-server";
import { getAdminUser, requireAdminPermission } from "@/lib/admin-guard";
import type { PendingVerification } from "@/lib/types";
import { VerificationsClient } from "./verifications-client";

export default async function AdminVerificationsPage() {
  const userPromise = getAdminUser();
  const verificationsPromise = serverApiGet<PendingVerification[]>("/admin/commercants/pending-verification");

  await requireAdminPermission(userPromise, AdminPermission.USERS_VERIFY);
  const { data: verifications } = await verificationsPromise;

  return <VerificationsClient initialVerifications={verifications ?? []} />;
}
