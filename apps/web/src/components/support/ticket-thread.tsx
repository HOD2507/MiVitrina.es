"use client";

import { useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";
import { SUPPORT_LIMITS } from "@mivitrina/shared";
import { getDateLocale } from "@/lib/date-locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ThreadMessage {
  id: string;
  content: string;
  fromStaff: boolean;
  createdAt: string;
  /** Nota interna (solo la ve el equipo). */
  isInternal?: boolean;
  /** Miembro del equipo que escribió, si se conoce. */
  staffAuthor?: string | null;
}

/**
 * Hilo de un ticket. `perspective` decide de qué lado va cada mensaje: el usuario ve los suyos a la derecha y los
 * del equipo a la izquierda; el equipo, al revés. Las notas internas (solo en la vista del equipo) llevan un estilo
 * propio, discontinuo y ámbar, para que nadie las confunda con una respuesta al usuario.
 */
export function TicketThread({
  messages,
  perspective,
  otherLabel,
}: {
  messages: ThreadMessage[];
  perspective: "user" | "staff";
  /** Nombre de la otra parte cuando el que mira es el equipo (el usuario). */
  otherLabel?: string;
}) {
  const t = useTranslations("Support");
  const tAdmin = useTranslations("Admin.support");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  return (
    <div role="log" aria-label={t("messagesAria")} className="flex flex-col gap-4">
      {messages.map((m) => {
        const mine = perspective === "user" ? !m.fromStaff : m.fromStaff;
        const label = m.isInternal
          ? tAdmin("internalNote")
          : perspective === "user"
            ? mine
              ? t("you")
              : t("staff")
            : mine
              ? (m.staffAuthor ?? tAdmin("youLabel"))
              : (otherLabel ?? tAdmin("userLabel"));

        return (
          <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
            <span className="mb-1 max-w-full truncate px-1 text-xs text-muted-foreground">
              {label}
              {m.isInternal && <> · {tAdmin("internalNoteHint")}</>}
            </span>
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm [overflow-wrap:anywhere] sm:max-w-[75%] ${
                m.isInternal
                  ? "border border-dashed border-amber-400/70 bg-amber-50 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100"
                  : mine
                    ? "bg-gradient-to-br from-primary to-glow-amber text-primary-foreground"
                    : "bg-muted"
              }`}
            >
              {m.content}
            </div>
            <time dateTime={m.createdAt} className="mt-1 px-1 text-[11px] text-muted-foreground">
              {new Date(m.createdAt).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" })}
            </time>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Caja de respuesta. `onSubmit` devuelve true si se envió (entonces se vacía el texto) y false si falló (se conserva
 * lo escrito). Ctrl/Cmd + Enter envía. Límite de caracteres compartido con la API (SUPPORT_LIMITS).
 */
export function TicketComposer({
  placeholder,
  submitLabel,
  onSubmit,
  hint,
  ariaLabel,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<boolean>;
  hint?: string;
  ariaLabel: string;
}) {
  const t = useTranslations("Support");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const remaining = SUPPORT_LIMITS.MESSAGE_MAX - text.length;
  const canSend = text.trim().length > 0 && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      if (await onSubmit(text.trim())) setText("");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={SUPPORT_LIMITS.MESSAGE_MAX}
        rows={3}
        disabled={sending}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {remaining < 500 ? t("charsLeft", { count: remaining }) : (hint ?? "")}
        </p>
        <Button type="button" onClick={send} disabled={!canSend} className="w-full sm:w-auto">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
