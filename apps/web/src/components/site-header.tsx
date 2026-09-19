import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoMark } from "@/components/logo-mark";

export async function SiteHeader() {
  const t = await getTranslations("Nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LogoMark className="size-5" />
          </span>
          <span className="font-heading text-[1.2rem] font-semibold tracking-tight">MiVitrina</span>
        </Link>

        {/* Liens vers les sections de la page d'accueil — depuis n'importe
            quelle page publique (login, recherche...), ça ramène à l'accueil
            et défile jusqu'à la section grâce à `scroll-mt` sur chacune. */}
        <nav className="hidden items-center gap-6 lg:flex">
          <Link href={{ pathname: "/", hash: "como-funciona" }} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("howItWorks")}
          </Link>
          <Link href={{ pathname: "/", hash: "funcionalidades" }} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("features")}
          </Link>
          <Link href={{ pathname: "/", hash: "faq" }} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("faq")}
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" render={<Link href="/recherche" />}>
            {t("search")}
          </Button>
          <LocaleSwitcher />
          <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" aria-hidden />
          <Button variant="ghost" size="sm" className="px-2 sm:px-3" render={<Link href="/login" />}>
            {t("login")}
          </Button>
          <Button size="sm" className="rounded-full px-3.5 sm:px-4" render={<Link href="/register" />}>
            {t("register")}
          </Button>
        </div>
      </div>
    </header>
  );
}
