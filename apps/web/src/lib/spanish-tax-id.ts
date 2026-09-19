/**
 * Validation du format NIF/NIE/CIF espagnol — algorithme standard de
 * calcul de la lettre/du chiffre de contrôle (le même que celui utilisé
 * par l'AEAT). Purement côté client, instantané : n'a rien à voir avec la
 * disponibilité du numéro (déjà pris ou non), vérifiée séparément auprès
 * de l'API (voir GET /auth/check-business-id).
 */
const NIF_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

function isValidNif(value: string): boolean {
  const match = /^(\d{8})([A-Z])$/.exec(value);
  if (!match) return false;
  const number = parseInt(match[1], 10);
  return NIF_LETTERS[number % 23] === match[2];
}

function isValidNie(value: string): boolean {
  const match = /^([XYZ])(\d{7})([A-Z])$/.exec(value);
  if (!match) return false;
  const prefixDigit: Record<string, string> = { X: "0", Y: "1", Z: "2" };
  const number = parseInt(prefixDigit[match[1]] + match[2], 10);
  return NIF_LETTERS[number % 23] === match[3];
}

function isValidCif(value: string): boolean {
  const match = /^([ABCDEFGHJKLMNPQRSUVW])(\d{7})([0-9A-J])$/.exec(value);
  if (!match) return false;
  const [, letter, digits, control] = match;

  let sumEven = 0;
  let sumOddDoubled = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = Number(digits[i]);
    if (i % 2 === 0) {
      const doubled = digit * 2;
      sumOddDoubled += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sumEven += digit;
    }
  }
  const controlDigit = (10 - ((sumEven + sumOddDoubled) % 10)) % 10;
  const controlLetter = "JABCDEFGHI"[controlDigit];

  // Certaines lettres d'organisme exigent un contrôle numérique, d'autres
  // une lettre ; le reste accepte historiquement les deux formes.
  if (/^[ABEH]$/.test(letter)) return control === String(controlDigit);
  if (/^[KLM]$/.test(letter)) return control === controlLetter;
  return control === String(controlDigit) || control === controlLetter;
}

/** Accepte NIF (personne physique), NIE (résident étranger) ou CIF (société) — tolère espaces/tirets et minuscules. */
export function isValidSpanishTaxId(raw: string): boolean {
  const value = raw.replace(/[\s-]/g, "").toUpperCase();
  return isValidNif(value) || isValidNie(value) || isValidCif(value);
}
