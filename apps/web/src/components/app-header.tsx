import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

/** En-tête minimal pour les pages authentifiées (pas de liens connexion/inscription). */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            M
          </span>
          <span className="text-lg">MiVitrina</span>
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
