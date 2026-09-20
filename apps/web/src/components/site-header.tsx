import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoMark } from "@/components/logo-mark";
import { SiteHeaderMobileMenu } from "@/components/site-header-mobile-menu";

interface SiteHeaderProps {
  /**
   * Masque connexion/inscription : pour les pages où le visiteur est déjà connecté
   * (ex: annonceur) et n'a pas à revoir ces deux boutons. Le lien "← Mi panel" n'est PAS
   * dans l'en-tête : chaque page le place près de son propre titre / lien de retour.
   */
  hideAuthLinks?: boolean;
}

export async function SiteHeader({ hideAuthLinks }: SiteHeaderProps = {}) {
  const t = await getTranslations("Nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4">
        {/* min-h-11 : zone tactile de 44px de haut sans changer le dessin (le logo reste à 32px). */}
        <Link href="/" className="flex min-h-11 items-center gap-2.5">
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

        {/* Escritorio (≥ lg) : sections en ligne au centre + actions à droite, comme avant. */}
        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="sm" render={<Link href="/recherche" />}>
            {t("search")}
          </Button>
          <LocaleSwitcher />
          {!hideAuthLinks && (
            <>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
              <Button variant="ghost" size="sm" className="px-3" render={<Link href="/login" />}>
                {t("login")}
              </Button>
              <Button size="sm" className="rounded-full px-4" render={<Link href="/register" />}>
                {t("register")}
              </Button>
            </>
          )}
        </div>

        {/* Mobile / tablette (< lg) : logo + « Regístrate » + ☰. Tout le reste (recherche, sections,
            connexion, langue) est dans le menu. Avant, logo + langue + connexion + inscription
            demandaient 408px : la page entière débordait sur la plupart des téléphones. Les cibles
            font 44px de haut (h-11) ; l'espace sert ici à tenir jusqu'à 320px. */}
        <div className="flex items-center gap-1.5 lg:hidden">
          {!hideAuthLinks && (
            <Button size="sm" className="h-11 rounded-full px-4 text-sm" render={<Link href="/register" />}>
              {t("register")}
            </Button>
          )}
          <SiteHeaderMobileMenu hideAuthLinks={hideAuthLinks} />
        </div>
      </div>
    </header>
  );
}
