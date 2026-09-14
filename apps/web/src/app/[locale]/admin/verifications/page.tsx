import { serverApiGet } from "@/lib/api-server";
import type { PendingVerification } from "@/lib/types";
import { VerificationsClient } from "./verifications-client";

export default async function AdminVerificationsPage() {
  const { data: verifications } = await serverApiGet<PendingVerification[]>("/admin/commercants/pending-verification");

  return <VerificationsClient initialVerifications={verifications ?? []} />;
}
