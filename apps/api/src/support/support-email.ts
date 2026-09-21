import { Locale } from "@mivitrina/shared";

/** Escapa lo que viene de usuarios/equipo antes de meterlo en HTML: el asunto y la respuesta son texto libre. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EXCERPT_MAX = 600;

const TEXTS: Record<Locale, { subject: (n: number) => string; intro: (n: number, s: string) => string; cta: string; footer: string }> = {
  [Locale.ES]: {
    subject: (n) => `Respuesta a tu solicitud de soporte #${n} — MiVitrina`,
    intro: (n, s) => `El equipo de soporte ha respondido a tu solicitud <strong>#${n}</strong> («${s}»):`,
    cta: "Ver la conversación y responder",
    footer: "Puedes contestar desde tu panel de MiVitrina; no respondas a este email.",
  },
  [Locale.EN]: {
    subject: (n) => `Reply to your support request #${n} — MiVitrina`,
    intro: (n, s) => `Our support team replied to your request <strong>#${n}</strong> (“${s}”):`,
    cta: "View the conversation and reply",
    footer: "Reply from your MiVitrina dashboard; please don't reply to this email.",
  },
};

/** Email de aviso al usuario cuando el equipo responde a su ticket (en su idioma, con el texto escapado y recortado). */
export function buildSupportReplyEmail(params: {
  locale: Locale;
  ticketNumber: number;
  ticketSubject: string;
  reply: string;
  url: string;
}): { subject: string; html: string } {
  const t = TEXTS[params.locale];
  const excerpt =
    params.reply.length > EXCERPT_MAX ? `${params.reply.slice(0, EXCERPT_MAX).trimEnd()}…` : params.reply;
  const html =
    `<p>${t.intro(params.ticketNumber, escapeHtml(params.ticketSubject))}</p>` +
    `<blockquote style="margin:12px 0;padding:8px 14px;border-left:3px solid #e6a23c;white-space:pre-wrap">${escapeHtml(excerpt)}</blockquote>` +
    `<p><a href="${escapeHtml(params.url)}">${t.cta}</a></p>` +
    `<p style="color:#777;font-size:12px">${t.footer}</p>`;
  return { subject: t.subject(params.ticketNumber), html };
}
