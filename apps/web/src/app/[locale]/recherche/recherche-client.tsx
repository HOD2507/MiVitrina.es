"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MapPin, Search, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { NearbyCommerce } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BottomSheet } from "@/components/bottom-sheet";
import type { MapMarker } from "@/components/commerce-map";

/** Composant nommé (pas une arrow function anonyme) : `next/dynamic` le rend
 * comme un composant React normal, donc `useTranslations` y fonctionne. */
function MapLoadingFallback() {
  const t = useTranslations("Recherche");
  return <div className="flex h-full items-center justify-center text-muted-foreground">{t("loadingMap")}</div>;
}

// Leaflet touche `window` dès l'import : composant chargé uniquement
// côté client, jamais lors du rendu serveur.
const CommerceMap = dynamic(() => import("@/components/commerce-map").then((m) => m.CommerceMap), {
  ssr: false,
  loading: MapLoadingFallback,
});

const DEFAULT_CENTER = { lat: 40.4168, lng: -3.7038 }; // Madrid, par défaut si géolocalisation refusée/indisponible
const RADIUS_OPTIONS = [1, 5, 10, 25, 50, 100];

export function RechercheClient() {
  const t = useTranslations("Recherche");
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState(10);
  const [results, setResults] = useState<NearbyCommerce[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(true);
  const [cityQuery, setCityQuery] = useState("");
  const [searchingCity, setSearchingCity] = useState(false);

  const runSearch = useCallback(async (point: { lat: number; lng: number }, radius: number) => {
    setLoading(true);
    try {
      const data = await api.get<NearbyCommerce[]>(`/discovery/search?lat=${point.lat}&lng=${point.lng}&radiusKm=${radius}`);
      setResults(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("searchError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Géolocalisation navigateur au chargement — si refusée, on garde le
  // centre par défaut (Madrid) et l'utilisateur peut chercher une ville.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      runSearch(DEFAULT_CENTER, radiusKm);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCenter(point);
        setLocating(false);
        runSearch(point, radiusKm);
      },
      () => {
        setLocating(false);
        runSearch(DEFAULT_CENTER, radiusKm);
      },
      { timeout: 5000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRadiusChange(value: string | null) {
    if (!value) return;
    const next = Number(value);
    setRadiusKm(next);
    runSearch(center, next);
  }

  async function handleCitySearch(e: FormEvent) {
    e.preventDefault();
    if (!cityQuery.trim()) return;
    setSearchingCity(true);
    try {
      const point = await api.get<{ latitude: number; longitude: number }>(
        `/discovery/geocode?q=${encodeURIComponent(cityQuery)}`,
      );
      const newCenter = { lat: point.latitude, lng: point.longitude };
      setCenter(newCenter);
      runSearch(newCenter, radiusKm);
    } catch {
      toast.error(t("placeNotFound"));
    } finally {
      setSearchingCity(false);
    }
  }

  const markers: MapMarker[] = results.map((r) => ({
    id: r.id,
    latitude: r.latitude,
    longitude: r.longitude,
    label: r.businessName,
  }));

  const searchBar = (
    <div className="flex flex-col gap-3 sm:flex-row">
      <form onSubmit={handleCitySearch} className="flex flex-1 gap-2">
        <Input
          placeholder={t("placeholderCity")}
          value={cityQuery}
          onChange={(e) => setCityQuery(e.target.value)}
        />
        <Button type="submit" disabled={searchingCity} variant="outline">
          {searchingCity ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>
      </form>

      <Select value={String(radiusKm)} onValueChange={handleRadiusChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue>{(v: string) => t("radiusLabel", { km: v })}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {RADIUS_OPTIONS.map((r) => (
            <SelectItem key={r} value={String(r)}>
              {r} km
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const statusLine = (loading || locating) && (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {locating ? t("locating") : t("searching")}
    </p>
  );

  const resultsList = (
    <div className="flex flex-col gap-3">
      {!loading && !locating && results.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">{t("noResults")}</CardContent>
        </Card>
      )}

      {results.map((commerce) => (
        <Link key={commerce.id} href={`/commerces/${commerce.id}`}>
          <Card className="hover-lift transition-colors hover:border-primary/50">
            <CardContent className="flex gap-3 py-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                {commerce.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={commerce.thumbnailUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Store className="size-6 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{commerce.businessName}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {commerce.city} · {commerce.distanceKm} km
                </p>
                <p className="mt-1 text-sm">
                  {t("spacesAvailable", { count: commerce.spaceCount })}
                  {commerce.minPrice !== null && (
                    <span className="font-semibold"> {t("fromPrice", { price: commerce.minPrice.toFixed(0) })}</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop / tablette : carte et liste côte à côte, comme avant. */}
      <div className="mx-auto hidden max-w-6xl px-4 py-8 lg:block">
        <div className="mb-6 flex flex-col gap-4">
          <h1 className="text-2xl font-medium">{t("title")}</h1>
          {searchBar}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="h-[600px] overflow-hidden rounded-lg border border-border lg:col-span-3">
            <CommerceMap center={center} markers={markers} />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-2">
            {statusLine}
            {resultsList}
          </div>
        </div>
      </div>

      {/* Mobile : carte plein écran + feuille coulissante, comme une app de cartographie. */}
      <div className="fixed inset-x-0 top-18 bottom-0 lg:hidden">
        <CommerceMap center={center} markers={markers} />
        {/* z-[1001] : les contrôles Leaflet (+/- zoom) utilisent eux-mêmes un z-index ~1000. */}
        <div className="absolute inset-x-3 top-3 z-[1001] rounded-xl bg-card p-3 shadow-lg">{searchBar}</div>
      </div>
      <div className="lg:hidden">
        <BottomSheet
          peek={
            <p className="text-sm font-medium text-muted-foreground">
              {loading || locating ? t("searching") : t("resultsFound", { count: results.length })}
            </p>
          }
        >
          {statusLine}
          {resultsList}
        </BottomSheet>
      </div>
    </>
  );
}
