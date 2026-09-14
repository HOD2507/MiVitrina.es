import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground">
                M
              </span>
              <span className="font-heading text-lg font-semibold tracking-tight">MiVitrina</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {t("markets")}
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">{t("productHeading")}</p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/recherche" className="transition-colors hover:text-foreground">
                  {tNav("search")}
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition-colors hover:text-foreground">
                  {tNav("register")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-foreground">
                  {tNav("login")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">{t("legalHeading")}</p>
            <p className="text-sm text-muted-foreground">{t("legalPlaceholder")}</p>
          </div>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          © {year} MiVitrina
        </div>
      </div>
    </footer>
  );
}
