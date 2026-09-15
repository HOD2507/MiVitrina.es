import { API_BASE_URL } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

function GoogleLogo() {
  // Logo officiel multicolore — usage autorisé pour un bouton "Se connecter avec Google".
  return (
    <svg viewBox="0 0 48 48" className="size-4.5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.5H24v7h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5-5C33.5 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 5.7 4.2C13.6 15.1 18.4 12 24 12c3.1 0 5.9 1.2 8 3.1l5-5C33.5 6.1 29 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5 0 9.4-1.9 12.8-5l-5.9-5c-1.9 1.4-4.4 2.3-6.9 2.3-5.2 0-9.6-3.3-11.2-7.9l-5.8 4.5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.5H24v7h11.3c-.8 2.3-2.2 4.2-4.1 5.6l5.9 5C40.7 34.9 44 30 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

interface GoogleAuthButtonProps {
  /** Rôle transmis via ?role= — utile uniquement pour une inscription (une connexion l'ignore). */
  role?: "ANNONCEUR" | "COMMERCANT";
  label: string;
  className?: string;
}

/**
 * Redirection OAuth classique (pas un appel fetch). Purement
 * présentationnel — c'est à l'appelant de vérifier `useAuthProviders()`
 * avant de le monter, pour ne jamais afficher de bouton mort tant que
 * Google n'est pas configuré côté API (voir docs/ARCHITECTURE.md).
 */
export function GoogleAuthButton({ role, label, className }: GoogleAuthButtonProps) {
  const href = role ? `${API_BASE_URL}/auth/google?role=${role}` : `${API_BASE_URL}/auth/google`;

  return (
    <Button variant="outline" className={className ?? "h-11 w-full gap-2.5 rounded-full text-base"} render={<a href={href} />}>
      <GoogleLogo />
      {label}
    </Button>
  );
}
