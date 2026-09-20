import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAnnonceurPanelHref } from "@/lib/get-annonceur-panel-href";
import { RechercheClient } from "./recherche-client";

/** Recherche géolocalisée de commerces — page publique, aucune authentification requise. */
export default async function RecherchePage() {
  const panelHref = await getAnnonceurPanelHref();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader hideAuthLinks={Boolean(panelHref)} />
      <main className="flex-1">
        {/* "← Mi panel" vive junto al título de la búsqueda, no en la barra superior. */}
        <RechercheClient panelHref={panelHref} />
      </main>
      {/* En móvil esta página es una pantalla de mapa a pantalla completa (mapa `fixed` + hoja
          inferior). El footer, `relative` y con fondo, se pintaba ENCIMA del mapa y lo tapaba:
          solo se muestra desde `lg`, donde el mapa está en el flujo normal de la página. */}
      <SiteFooter className="hidden lg:block" />
    </div>
  );
}
