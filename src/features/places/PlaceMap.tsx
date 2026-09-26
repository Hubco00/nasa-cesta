import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { LatLng } from './types'

// Slovensko — úvodný výrez, kým nie je vybrané žiadne miesto.
const SLOVAKIA_BOUNDS: L.LatLngBoundsExpression = [
  [47.73, 16.83],
  [49.61, 22.57],
]

const PIN_ICON = L.divIcon({
  className: 'place-pin',
  html: `<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true">
    <path d="M16 41s13-14.2 13-24.5A13 13 0 0 0 3 16.5C3 26.8 16 41 16 41z"
      fill="var(--color-accent)" stroke="#fff" stroke-width="2"/>
    <path d="M16 23.5l-4.6-4.4a2.9 2.9 0 0 1 4.1-4.1l.5.5.5-.5a2.9 2.9 0 0 1 4.1 4.1z"
      fill="#fff"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 41],
})

interface SearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  boundingbox: [string, string, string, string]
}

/**
 * Skutočná mapa (OpenStreetMap, bez API kľúča) — ťuknutím sa vyberie
 * miesto. Vyhľadávanie ide cez verejný Nominatim (iba na Enter, nie pri
 * každom písmene — tak to vyžadujú jeho pravidlá používania).
 */
export function PlaceMap({
  value,
  onPick,
  radiusMeters,
}: {
  value: LatLng | null
  onPick: (place: LatLng) => void
  /** Tolerancia okolo vybraného miesta (iba v admine). */
  radiusMeters?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const onPickRef = useRef(onPick)
  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)

  useEffect(() => {
    const map = L.map(containerRef.current!, { zoomControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) =>
      onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }),
    )
    mapRef.current = map

    // Mapa v overlayi s animáciou — prepočítať veľkosť, keď sa ustáli.
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(containerRef.current!)
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
  }, [])

  // Úvodný výrez: vybrané miesto zblízka, inak celé Slovensko.
  const initialValue = useRef(value)
  useEffect(() => {
    const map = mapRef.current!
    const start = initialValue.current
    if (start) map.setView([start.lat, start.lng], 16)
    else map.fitBounds(SLOVAKIA_BOUNDS)
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!value) {
      markerRef.current?.remove()
      markerRef.current = null
      circleRef.current?.remove()
      circleRef.current = null
      return
    }
    const at: L.LatLngExpression = [value.lat, value.lng]
    if (markerRef.current) markerRef.current.setLatLng(at)
    else markerRef.current = L.marker(at, { icon: PIN_ICON, keyboard: false }).addTo(map)

    if (radiusMeters) {
      if (circleRef.current) circleRef.current.setLatLng(at).setRadius(radiusMeters)
      else
        circleRef.current = L.circle(at, {
          radius: radiusMeters,
          color: '#a83348',
          weight: 2,
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map)
    }
  }, [value, radiusMeters])

  async function search(event: FormEvent) {
    event.preventDefault()
    // React posiela submit aj cez portál do rodičovského formulára (admin
    // formulár otázky) — ten sa nesmie odoslať pri hľadaní na mape.
    event.stopPropagation()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchFailed(false)
    try {
      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        limit: '5',
        'accept-language': 'sk',
      })
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
      if (!res.ok) throw new Error(String(res.status))
      setResults((await res.json()) as SearchResult[])
    } catch {
      setSearchFailed(true)
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  function goTo(result: SearchResult) {
    const [south, north, west, east] = result.boundingbox.map(Number)
    mapRef.current?.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { maxZoom: 17 },
    )
    setResults(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={search} className="relative flex gap-2 p-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hľadať mesto, ulicu, podnik…"
          aria-label="Hľadať na mape"
          className="min-w-0 flex-1 rounded-lg border border-[var(--paper-border)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] dark:bg-black/20"
        />
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {searching ? '…' : 'Hľadať'}
        </button>

        {(results || searchFailed) && (
          <div className="absolute inset-x-2 top-full z-[1100] mt-1 overflow-hidden rounded-lg border border-[var(--paper-border)] bg-[var(--color-bg)] shadow-lg">
            {searchFailed && (
              <p className="px-3 py-2 text-sm text-rose-600">
                Vyhľadávanie teraz nefunguje — posuň a priblíž mapu ručne.
              </p>
            )}
            {results?.length === 0 && (
              <p className="px-3 py-2 text-sm text-[var(--color-muted)]">
                Nič som nenašiel.
              </p>
            )}
            {results?.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => goTo(r)}
                className="block w-full border-b border-[var(--paper-border)] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--color-accent)]/10"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </form>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  )
}
