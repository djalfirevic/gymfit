'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useTheme } from '@/lib/theme'

export type MapLocation = { id: number; name: string; address: string; latitude: string; longitude: string }

// CARTO basemaps are free, need no key, and ship a matching dark variant --
// plain OSM tiles are light-only and glare against the dark theme.
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

/**
 * Leaflet's default marker resolves its icon from relative image paths, which
 * bundlers rewrite and break. A divIcon sidesteps that entirely and lets the
 * pin pick up the theme's primary color.
 */
function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg viewBox="0 0 24 32" width="28" height="37" style="color:var(--primary);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20c0-6.6-5.4-12-12-12z"/><circle cx="12" cy="12" r="4.6" fill="#fff"/></svg>`,
    iconSize: [28, 37],
    iconAnchor: [14, 37],
    popupAnchor: [0, -34],
  })
}

function Recenter({ position }: { position: [number, number] | null }) {
  const map = useMap()

  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 0.6 })
  }, [map, position])

  return null
}

export function LocationMap({
  locations,
  selectedId,
}: {
  locations: MapLocation[]
  selectedId: number | null
}) {
  const theme = useTheme()
  const t = useTranslations('locations')

  const points = locations
    .map((location) => ({ location, lat: Number(location.latitude), lng: Number(location.longitude) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))

  if (points.length === 0) {
    return (
      <div className="grid h-[420px] place-items-center rounded-card border border-line bg-surface-2 text-muted">
        {t('mapEmpty')}
      </div>
    )
  }

  const selected = points.find((point) => point.location.id === selectedId) ?? points[0]
  const center: [number, number] = [selected.lat, selected.lng]
  const icon = pinIcon()

  return (
    <MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom
      className="h-[420px] w-full overflow-hidden rounded-card border border-line"
    >
      {/* Remounting on theme change swaps the tile set; TileLayer does not
          reload from a changed url prop alone. */}
      <TileLayer key={theme} url={theme === 'dark' ? TILES.dark : TILES.light} attribution={ATTRIBUTION} />
      {points.map((point) => (
        <Marker key={point.location.id} position={[point.lat, point.lng]} icon={icon}>
          <Popup>
            <strong>{point.location.name}</strong>
            <br />
            {point.location.address}
          </Popup>
        </Marker>
      ))}
      <Recenter position={selectedId ? [selected.lat, selected.lng] : null} />
    </MapContainer>
  )
}
