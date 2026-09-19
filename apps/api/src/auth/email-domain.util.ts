import { Logger } from "@nestjs/common";
import { resolveMx, resolve4, resolve6 } from "node:dns/promises";

const logger = new Logger("EmailDomainCheck");

/**
 * Vérifie qu'un domaine d'email est réellement capable de recevoir du
 * courrier — pas que la boîte précise existe (ça, aucune vérification DNS
 * ne peut le garantir, voir le commentaire plus bas), juste que le domaine
 * est enregistré et configuré pour le mail.
 *
 * Complète (sans remplacer) la détection de faute de frappe côté front
 * (voir apps/web/src/lib/email-typo.ts) : un domaine "squatté" comme
 * gmil.com a de vrais enregistrements MX (quelqu'un l'a enregistré pour
 * récupérer les fautes de frappe vers gmail.com) donc cette vérification
 * seule ne l'aurait pas détecté — c'est le rôle de la liste de domaines
 * connus. Ici, on attrape l'autre cas : un domaine qui n'existe tout
 * simplement pas ou n'a aucune configuration mail du tout.
 *
 * Ordre de résolution identique à la RFC 5321 §5.1 : MX d'abord, puis
 * repli sur l'enregistrement A/AAAA du domaine lui-même si aucun MX n'est
 * déclaré (autorisé par la RFC, encore utilisé par de petits domaines).
 *
 * "Fail open" sur toute erreur DNS qui n'est pas une absence confirmée de
 * domaine (timeout, résolveur indisponible...) : mieux vaut laisser passer
 * une inscription légitime que la bloquer à cause d'un souci réseau côté
 * serveur qui n'a rien à voir avec l'utilisateur.
 */
export async function isEmailDomainDeliverable(email: string): Promise<boolean> {
  const at = email.lastIndexOf("@");
  if (at === -1) return true;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return true;

  try {
    const mx = await resolveMx(domain);
    if (mx.length > 0) return true;
  } catch (err) {
    if (isDefinitiveDnsFailure(err)) return false;
    logger.warn(`Vérification MX indisponible pour "${domain}", on laisse passer.`);
    return true;
  }

  // Aucun MX déclaré : repli RFC sur l'enregistrement A puis AAAA du
  // domaine lui-même (essayés séparément pour ne pas perdre le détail de
  // l'erreur — un domaine IPv4-only ne doit pas être jugé sur l'échec AAAA).
  try {
    const a = await resolve4(domain);
    if (a.length > 0) return true;
  } catch (err) {
    if (!isDefinitiveDnsFailure(err)) {
      logger.warn(`Vérification A indisponible pour "${domain}", on laisse passer.`);
      return true;
    }
  }

  try {
    const aaaa = await resolve6(domain);
    return aaaa.length > 0;
  } catch (err) {
    if (isDefinitiveDnsFailure(err)) return false;
    logger.warn(`Vérification AAAA indisponible pour "${domain}", on laisse passer.`);
    return true;
  }
}

/** ENOTFOUND/ENODATA = le domaine (ou son type d'enregistrement) n'existe
 * vraiment pas. Toute autre erreur (SERVFAIL, timeout...) est ambiguë. */
function isDefinitiveDnsFailure(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "ENOTFOUND" || code === "ENODATA";
}
