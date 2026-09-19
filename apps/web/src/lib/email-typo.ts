/**
 * Détection de fautes de frappe courantes dans le domaine d'un email, à
 * l'inscription/la connexion — demande explicite de l'utilisateur après
 * avoir créé un compte sur "hanioulahdj2005@gmil.com" (lettres inversées +
 * "gmil" au lieu de "gmail") : l'email de vérification ne pouvait
 * évidemment jamais arriver, et rien ne l'a signalé sur le moment.
 *
 * Ne se déclenche que si le domaine saisi est très proche (distance
 * d'édition ≤ 2) d'un fournisseur grand public très répandu — jamais sur
 * un domaine professionnel inhabituel mais légitime (aucun de la liste
 * n'a de raison de matcher un domaine d'entreprise par accident, la
 * distance d'édition entre deux domaines sans rapport étant presque
 * toujours bien supérieure à 2).
 */
const POPULAR_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.es",
  "outlook.com",
  "outlook.es",
  "live.com",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "me.com",
  "msn.com",
  "aol.com",
  "protonmail.com",
];

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[rows - 1][cols - 1];
}

/**
 * Renvoie l'email corrigé suggéré (ex: "toi@gmil.com" -> "toi@gmail.com"),
 * ou `null` si rien ne semble être une faute de frappe sur un domaine
 * connu (y compris si le domaine saisi est déjà correct/inconnu).
 */
export function suggestEmailCorrection(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;

  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain || POPULAR_EMAIL_DOMAINS.includes(domain)) return null;

  let best: { domain: string; distance: number } | null = null;
  for (const candidate of POPULAR_EMAIL_DOMAINS) {
    // Écarte tout de suite les domaines de longueur trop différente :
    // évite un calcul inutile et les faux positifs sur un domaine sans
    // rapport (ex: un domaine pro plus long).
    if (Math.abs(candidate.length - domain.length) > 2) continue;
    const distance = levenshtein(domain, candidate);
    if (distance > 0 && distance <= 2 && (!best || distance < best.distance)) {
      best = { domain: candidate, distance };
    }
  }

  return best ? email.slice(0, at + 1) + best.domain : null;
}
