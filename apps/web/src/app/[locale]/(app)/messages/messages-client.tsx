"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Send, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { ChatThreadSummary, ChatMessage } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const THREADS_POLL_MS = 15000;
const MESSAGES_POLL_MS = 4000;

interface MessagesClientProps {
  initialThreads: ChatThreadSummary[];
  initialThreadId: string | null;
  currentUserId: string;
}

/**
 * Messagerie annonceur<->commerçant. Pas de websocket au MVP : un simple
 * polling (4s pour les messages de la conversation ouverte, 15s pour la
 * liste des conversations) suffit à donner une impression de "quasi
 * temps réel" sans complexité d'infrastructure supplémentaire.
 */
export function MessagesClient({ initialThreads, initialThreadId, currentUserId }: MessagesClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [threads, setThreads] = useState(initialThreads);
  const [selectedId, setSelectedId] = useState<string | null>(initialThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadThreads() {
    try {
      setThreads(await api.get<ChatThreadSummary[]>("/chat/threads"));
    } catch {
      // Rafraîchissement en arrière-plan : une erreur ponctuelle n'est pas bloquante.
    }
  }

  async function loadMessages(threadId: string, silent = false) {
    if (!silent) setLoadingMessages(true);
    try {
      setMessages(await api.get<ChatMessage[]>(`/chat/threads/${threadId}/messages`));
    } catch (err) {
      if (!silent) toast.error(err instanceof ApiError ? err.message : "Impossible de charger les messages.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedId);
    const interval = setInterval(() => loadMessages(selectedId, true), MESSAGES_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const interval = setInterval(loadThreads, THREADS_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectThread(id: string) {
    setSelectedId(id);
    router.replace(`${pathname}?thread=${id}`);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t)));
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !input.trim()) return;

    setSending(true);
    try {
      const message = await api.post<ChatMessage>(`/chat/threads/${selectedId}/messages`, {
        content: input.trim(),
      });
      setMessages((prev) => [...prev, message]);
      setInput("");
      if (message.flagged) {
        toast.info("Vos coordonnées ont été masquées — les échanges doivent rester sur la plateforme.");
      }
      loadThreads();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "L'envoi a échoué.");
    } finally {
      setSending(false);
    }
  }

  const selectedThread = threads.find((t) => t.id === selectedId);

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <Card className="h-[32rem] gap-0 overflow-y-auto p-0">
        {threads.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Aucune conversation pour le moment.</p>
        )}
        <div className="flex flex-col divide-y divide-border">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => selectThread(thread.id)}
              className={`flex flex-col gap-0.5 px-4 py-3 text-left text-sm transition-colors hover:bg-muted ${
                thread.id === selectedId ? "bg-muted" : ""
              }`}
            >
              <span className="flex items-center justify-between gap-2 font-medium">
                <span className="truncate">{thread.otherPartyName}</span>
                {thread.unreadCount > 0 && <Badge>{thread.unreadCount}</Badge>}
              </span>
              {thread.lastMessage && (
                <span className="truncate text-xs text-muted-foreground">{thread.lastMessage.content}</span>
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card className="h-[32rem] gap-0 p-0">
        {!selectedThread ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Sélectionnez une conversation.
          </div>
        ) : (
          <>
            <div className="border-b border-border px-4 py-3 font-medium">{selectedThread.otherPartyName}</div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {loadingMessages && messages.length === 0 && (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {messages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.flagged && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <ShieldAlert className="size-3" /> coordonnées masquées
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écrivez votre message..."
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
