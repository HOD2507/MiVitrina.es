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

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  onClick?: () => void;
}

interface CommerceMapProps {
  center: { lat: number; lng: number };
  markers: MapMarker[];
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

export function CommerceMap({ center, markers, className }: CommerceMapProps) {
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
      <Marker position={[center.lat, center.lng]}>
        <Popup>Votre position</Popup>
      </Marker>
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
