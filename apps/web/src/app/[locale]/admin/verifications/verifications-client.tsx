"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CheckCircle2, ExternalLink, Loader2, XCircle, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { PendingVerification } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";

export function VerificationsClient({ initialVerifications }: { initialVerifications: PendingVerification[] }) {
  const t = useTranslations("Admin.verifications");
  const [verifications, setVerifications] = useState(initialVerifications);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingVerification | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function approve(v: PendingVerification) {
    setSubmittingId(v.id);
    try {
      await api.patch(`/admin/commercants/${v.id}/verification`, { action: "approve" });
      toast.success(t("approveSuccess", { name: v.businessName }));
      setVerifications((prev) => prev.filter((x) => x.id !== v.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSubmittingId(null);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    setSubmittingId(rejectTarget.id);
    try {
      await api.patch(`/admin/commercants/${rejectTarget.id}/verification`, { action: "reject", note: rejectNote });
      toast.success(t("rejectSuccess", { name: rejectTarget.businessName }));
      setVerifications((prev) => prev.filter((x) => x.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectNote("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="bg-mesh-panel mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:py-10">
      <Reveal>
        <div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </Reveal>

      {verifications.length === 0 ? (
        <Reveal delay={80}>
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <EmptyState icon={ShieldCheck} title={t("emptyTitle")} description={t("emptyDesc")} className="py-10" />
          </div>
        </Reveal>
      ) : (
        <div className="flex flex-col gap-4">
          {verifications.map((v, i) => (
            <Reveal key={v.id} delay={80 + i * 60}>
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-lg">{v.businessName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {v.email} · {v.city} · {v.country} · {v.businessIdType} {v.businessIdNumber}
                    </p>
                  </div>
                  {v.documentUrl ? (
                    <Button size="sm" variant="outline" render={<a href={v.documentUrl} target="_blank" rel="noreferrer" />}>
                      <ExternalLink className="size-3.5" />
                      {t("viewDocument")}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("noDocument")}</p>
                  )}
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button size="sm" disabled={submittingId === v.id} onClick={() => approve(v)}>
                    {submittingId === v.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                    {t("approve")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={submittingId === v.id} onClick={() => setRejectTarget(v)}>
                    <XCircle className="size-3.5" />
                    {t("reject")}
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectDialogTitle")}</DialogTitle>
            <DialogDescription>{t("rejectDialogDesc", { name: rejectTarget?.businessName ?? "" })}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t("rejectPlaceholder")} />
          <DialogFooter>
            <Button variant="destructive" disabled={!rejectNote.trim() || !!submittingId} onClick={reject}>
              {t("confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
