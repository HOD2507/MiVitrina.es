import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RechercheClient } from "./recherche-client";

/** Recherche géolocalisée de commerces — page publique, aucune authentification requise. */
export default function RecherchePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <RechercheClient />
      </main>
      <SiteFooter />
    </div>
  );
}
