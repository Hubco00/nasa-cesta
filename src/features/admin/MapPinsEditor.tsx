import { useEffect, useState } from 'react'
import { findCity, MAP_CITIES } from '../map/cities'
import { ContentManager } from './content/ContentManager'
import { removeChapterPhotos } from '../../lib/storage'
import {
  adminCreateMapPin,
  adminDeleteMapPin,
  adminListBlocks,
  adminListMapPins,
  type MapPinRow,
} from './api'
import { getErrorMessage } from '../../lib/errors'

export function MapPinsEditor({ chapterId }: { chapterId: string }) {
  const [pins, setPins] = useState<MapPinRow[]>([])
  const [newCity, setNewCity] = useState('')
  const [openPinId, setOpenPinId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setPins(await adminListMapPins(chapterId))
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload zámerne nie je v deps, inak by re-render vytváral novú referenciu a spôsobil nekonečnú slučku
  }, [chapterId])

  const usedCities = new Set(pins.map((p) => p.city_key))
  const availableCities = MAP_CITIES.filter((c) => !usedCities.has(c.key))

  async function addPin() {
    if (!newCity) return
    setError(null)
    try {
      const pin = await adminCreateMapPin(chapterId, newCity)
      setNewCity('')
      await reload()
      setOpenPinId(pin.id)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function removePin(pin: MapPinRow) {
    const label = findCity(pin.city_key)?.label ?? pin.city_key
    if (!confirm(`Zmazať miesto ${label} aj s celým jeho obsahom v tejto kapitole?`))
      return
    const blocks = await adminListBlocks(chapterId, pin.id)
    await adminDeleteMapPin(pin.id) // bloky zmaže ON DELETE CASCADE
    await removeChapterPhotos(blocks.flatMap((b) => b.storage_path ?? []))
    if (openPinId === pin.id) setOpenPinId(null)
    await reload()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--color-muted)]">
        Miesta, ktoré sa hráčke v tejto kapitole zobrazia na mape ako guličky. Každé
        miesto má vlastné príbehy a fotky — to isté mesto môže mať v inej kapitole úplne
        iný obsah.
      </p>

      {pins.map((pin) => {
        const label = findCity(pin.city_key)?.label ?? pin.city_key
        const isOpen = openPinId === pin.id
        return (
          <div key={pin.id} className="rounded-xl border border-[var(--paper-border)]">
            <div className="flex items-center justify-between gap-2 p-3">
              <button
                onClick={() => setOpenPinId(isOpen ? null : pin.id)}
                className="flex flex-1 items-center gap-2 text-left font-medium"
                aria-expanded={isOpen}
              >
                <span className="inline-block h-3 w-3 rounded-full bg-[var(--color-gold-500)]" />
                {label}
                <span className="text-xs text-[var(--color-muted)]">
                  {isOpen ? '▲ skryť obsah' : '▼ upraviť obsah'}
                </span>
              </button>
              <button
                onClick={() => void removePin(pin)}
                className="text-sm text-rose-600"
              >
                Zmazať
              </button>
            </div>
            {isOpen && (
              <div className="border-t border-[var(--paper-border)] p-3">
                <ContentManager chapterId={chapterId} mapPinId={pin.id} />
              </div>
            )}
          </div>
        )
      })}

      {availableCities.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            aria-label="Mesto na mape"
            className="flex-1 rounded-lg border border-rose-200 bg-transparent px-2 py-1.5 text-sm"
          >
            <option value="">— vyber mesto —</option>
            {availableCities.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => void addPin()}
            disabled={!newCity}
            className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            + Pridať miesto
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">Pridanie zlyhalo: {error}</p>}
    </div>
  )
}
