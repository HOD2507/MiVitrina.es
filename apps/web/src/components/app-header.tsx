import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";

/** En-tête minimal pour les pages authentifiées (pas de liens connexion/inscription). */
export async function AppHeader() {
  const t = await getTranslations("AppShell");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex min-h-11 items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LogoMark className="size-5" />
          </span>
          <span className="font-heading text-[1.2rem] font-semibold tracking-tight">MiVitrina</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Sous 384px (iPhone SE/mini 375, Android 360, 320), logo + « Mensajes » + langue dépassent l'écran
              maintenant que les boutons font 44px de haut : on ne garde que l'icône (44×44). Le texte reste
              dans le DOM (`sr-only`) : c'est le nom accessible du bouton. */}
          <Button size="sm" variant="ghost" className="max-[24rem]:w-11 max-[24rem]:px-0" render={<Link href="/messages" />}>
            <MessageCircle className="size-4" />
            <span className="max-[24rem]:sr-only">{t("messages")}</span>
          </Button>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
