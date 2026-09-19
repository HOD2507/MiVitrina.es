/**
 * Empêche une vérification serveur (email disponible, NIF/CIF disponible...)
 * de bloquer indéfiniment l'interface si la requête traîne (réseau lent,
 * DNS qui met du temps à répondre côté API...). Passé le délai, on rejette
 * — l'appelant doit alors "fail open" (laisser passer) plutôt que de
 * garder l'utilisateur coincé sur un bouton "Comprobando..." qui ne
 * finit jamais. Voir RegisterForm.validateStep.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
