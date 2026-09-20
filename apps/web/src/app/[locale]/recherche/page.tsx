import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAnnonceurPanelHref } from "@/lib/get-annonceur-panel-href";
import { RechercheClient } from "./recherche-client";

/** Recherche géolocalisée de commerces — page publique, aucune authentification requise. */
export default async function RecherchePage() {
  const panelHref = await getAnnonceurPanelHref();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader panelHref={panelHref} />
      <main className="flex-1">
        <RechercheClient />
      </main>
      <SiteFooter />
    </div>
  );
}
