"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
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

export function VerificationsClient({ initialVerifications }: { initialVerifications: PendingVerification[] }) {
  const [verifications, setVerifications] = useState(initialVerifications);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingVerification | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function approve(v: PendingVerification) {
    setSubmittingId(v.id);
    try {
      await api.patch(`/admin/commercants/${v.id}/verification`, { action: "approve" });
      toast.success(`${v.businessName} vérifié.`);
      setVerifications((prev) => prev.filter((x) => x.id !== v.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmittingId(null);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    setSubmittingId(rejectTarget.id);
    try {
      await api.patch(`/admin/commercants/${rejectTarget.id}/verification`, { action: "reject", note: rejectNote });
      toast.success(`${rejectTarget.businessName} refusé.`);
      setVerifications((prev) => prev.filter((x) => x.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectNote("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmittingId(null);
    }
  }

  if (verifications.length === 0) {
    return <p className="text-muted-foreground">Aucune vérification en attente.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {verifications.map((v) => (
        <Card key={v.id}>
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
                Voir le justificatif
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun justificatif envoyé</p>
            )}
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" disabled={submittingId === v.id} onClick={() => approve(v)}>
              {submittingId === v.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Approuver
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={submittingId === v.id}
              onClick={() => setRejectTarget(v)}
            >
              <XCircle className="size-3.5" />
              Refuser
            </Button>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la vérification</DialogTitle>
            <DialogDescription>
              Expliquez pourquoi — {rejectTarget?.businessName} pourra renvoyer un nouveau justificatif.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Ex : document illisible, ne correspond pas au nom de l'entreprise..."
          />
          <DialogFooter>
            <Button variant="destructive" disabled={!rejectNote.trim() || !!submittingId} onClick={reject}>
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
