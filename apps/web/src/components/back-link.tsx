import { ArrowLeft } from "lucide-react";
import { cn } from "cn";
import { Link } from "@/i18n/navigation";

/**
 * Lien de retour vers la liste parente, à afficher en haut de toute page
 * de détail/sous-page — une page atteinte en cliquant un élément d'une
 * liste, jamais depuis le menu latéral (ex: détail d'un utilisateur,
 * fiche d'un commerce...).
 *
 * Toujours un vrai lien vers une URL explicite (`href`), jamais
 * `router.back()` : fonctionne à l'identique après un rechargement de
 * page ou en arrivant par un lien direct, ce qu'un simple retour
 * d'historique ne permet pas (demande explicite).
 */
export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/70",
        className,
      )}
    >
      <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
      {label}
    </Link>
  );
}
