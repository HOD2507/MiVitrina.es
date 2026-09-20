"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Correctif standard react-leaflet/webpack : sans ça, les icônes de
// marqueur par défaut pointent vers des chemins relatifs invalides une
// fois passées par le bundler (404 silencieux, marqueurs invisibles).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: (markerIcon2x as unknown as { src: string }).src,
  iconUrl: (markerIcon as unknown as { src: string }).src,
  shadowUrl: (markerShadow as unknown as { src: string }).src,
});

/**
 * Marqueur "Vous êtes ici", façon Google Maps : point bleu à liseré blanc
 * entouré d'un halo translucide — volontairement très différent du pin en
 * forme de goutte des commerces, pour qu'on ne confonde jamais "où je suis"
 * et "où sont les commerces". Styles en ligne (et non des classes Tailwind)
 * car ce HTML est injecté par Leaflet hors du rendu React : rien ne dépend
 * ainsi du scan des classes ni d'une feuille de style globale.
 * `className: ""` retire le style par défaut de divIcon (fond blanc + bordure).
 */
const USER_LOCATION_ICON = L.divIcon({
  className: "",
  html:
    '<span style="position:relative;display:flex;width:100%;height:100%;align-items:center;justify-content:center">' +
    '<span style="position:absolute;width:44px;height:44px;border-radius:9999px;background:rgba(66,133,244,.2);border:1px solid rgba(66,133,244,.35)"></span>' +
    '<span style="position:relative;width:18px;height:18px;border-radius:9999px;background:#4285f4;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>' +
    "</span>",
  iconSize: [44, 44],
  iconAnchor: [22, 22], // le centre du point = la position exacte (un pin, lui, s'ancre par sa pointe)
});

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  onClick?: () => void;
}

interface CommerceMapProps {
  /** Centre de la vue (et de la recherche) : peut être Madrid par défaut ou une ville tapée, pas forcément l'utilisateur. */
  center: { lat: number; lng: number };
  markers: MapMarker[];
  /** Position réelle de l'utilisateur (géolocalisation) ; null/absente = inconnue, aucun point bleu n'est affiché. */
  userPosition?: { lat: number; lng: number } | null;
  /** Libellé traduit du point bleu (popup + texte alternatif). */
  userPositionLabel?: string;
  className?: string;
}

/** Recentre la carte quand `center` change (ex: nouvelle recherche). */
function Recenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng]);
  }, [center.lat, center.lng, map]);
  return null;
}

export function CommerceMap({ center, markers, userPosition, userPositionLabel, className }: CommerceMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {userPosition && (
        <Marker
          position={[userPosition.lat, userPosition.lng]}
          icon={USER_LOCATION_ICON}
          // Au-dessus des pins : un commerce situé au même endroit ne doit pas cacher le point.
          zIndexOffset={1000}
          // `title` (et non seulement `alt`) : Leaflet ne reflète `alt` que sur un <img>, or ce
          // marqueur est un <div> — sans `title` il serait focalisable mais sans nom accessible.
          title={userPositionLabel}
          alt={userPositionLabel}
        >
          {userPositionLabel && <Popup>{userPositionLabel}</Popup>}
        </Marker>
      )}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          eventHandlers={marker.onClick ? { click: marker.onClick } : undefined}
        >
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
