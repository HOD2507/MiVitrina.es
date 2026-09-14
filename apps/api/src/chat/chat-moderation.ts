/**
 * Modération anti-contournement des messages du chat annonceur<->commerçant
 * (voir cross-cutting "Modération anti-contournement" du cahier des
 * charges). Plutôt que de bloquer purement et simplement l'envoi, on
 * MASQUE les coordonnées détectées dans le contenu réellement stocké et
 * livré à l'autre partie (empêche vraiment le contournement, contrairement
 * à un simple flag après coup) tout en gardant une trace (`flagged`,
 * `flagReason`) exploitable plus tard par la modération admin.
 *
 * Heuristique volontairement simple pour le MVP : regex sur emails, liens
 * et séquences de chiffres ressemblant à un numéro de téléphone. Faux
 * positifs possibles (ex: une date collée sans séparateur) — acceptable
 * ici, l'objectif est d'empêcher la fuite de vraies coordonnées, pas
 * d'être irréprochable sur 100% des messages.
 */

export interface ChatModerationResult {
  content: string;
  flagged: boolean;
  flagReason: string | null;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
/** Au moins 8 chiffres au total, séparateurs espace/point/tiret tolérés. */
const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?(?:\d[\s.-]?){7,}\d/g;

function maskPattern(content: string, regex: RegExp, mask: string): { content: string; matched: boolean } {
  let matched = false;
  const masked = content.replace(regex, () => {
    matched = true;
    return mask;
  });
  return { content: masked, matched };
}

export function moderateChatMessage(rawContent: string): ChatModerationResult {
  let content = rawContent;
  const reasons: string[] = [];

  const email = maskPattern(content, EMAIL_RE, "[coordonnées masquées]");
  content = email.content;
  if (email.matched) reasons.push("adresse email détectée");

  const url = maskPattern(content, URL_RE, "[lien masqué]");
  content = url.content;
  if (url.matched) reasons.push("lien externe détecté");

  const phone = maskPattern(content, PHONE_RE, "[numéro masqué]");
  content = phone.content;
  if (phone.matched) reasons.push("numéro de téléphone détecté");

  return {
    content,
    flagged: reasons.length > 0,
    flagReason: reasons.length > 0 ? reasons.join(", ") : null,
  };
}
