import { lazy, Suspense, useState } from 'react'
import { formatDistance, type LatLng } from '../../places/types'

const PlacePickerOverlay = lazy(() => import('../../places/PlacePickerOverlay'))

export interface PlaceValue extends LatLng {
  radiusMeters: number
}

/**
 * Miesto na skutočnej mape + tolerancia (admin) — pre otázku „ukáže na mape“,
 * krok „ďalej až na mieste“ aj polohu kapitoly.
 */
export function PlaceField({
  label,
  value,
  onChange,
  radiusOptions,
  defaultRadius,
  loading = false,
  help,
}: {
  label: string
  value: PlaceValue | null
  onChange: (value: PlaceValue) => void
  radiusOptions: number[]
  defaultRadius: number
  loading?: boolean
  help?: string
}) {
  const [open, setOpen] = useState(false)
  const [draftRadius, setDraftRadius] = useState(defaultRadius)
  const options = [...new Set([...radiusOptions, draftRadius])].sort((a, b) => a - b)

  function openPicker() {
    setDraftRadius(value?.radiusMeters ?? defaultRadius)
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {loading ? (
        <p className="text-[var(--color-muted)]">Načítavam…</p>
      ) : value ? (
        <p className="rounded-lg border border-[var(--paper-border)] px-3 py-2">
          <span aria-hidden="true">📍 </span>
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          <span className="text-[var(--color-muted)]">
            {' '}
            · tolerancia {formatDistance(value.radiusMeters)}
          </span>
        </p>
      ) : (
        <p className="text-[var(--color-muted)]">Zatiaľ nevybrané.</p>
      )}
      <button
        type="button"
        onClick={openPicker}
        disabled={loading}
        className="self-start rounded-lg border border-[var(--color-accent)] px-3 py-2 font-medium text-[var(--color-accent)] disabled:opacity-60"
      >
        {value ? 'Zmeniť na mape' : 'Vybrať na mape'}
      </button>
      {help && <span className="text-xs text-[var(--color-muted)]">{help}</span>}

      {open && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-muted)]">
              Načítavam mapu…
            </div>
          }
        >
          <PlacePickerOverlay
            title={label}
            backLabel="Späť"
            initial={value}
            radiusMeters={draftRadius}
            onClose={() => setOpen(false)}
            footer={(picked) => (
              <div className="flex items-center gap-2">
                <label className="flex min-w-0 flex-1 flex-col text-xs text-[var(--color-muted)]">
                  Tolerancia
                  <select
                    value={draftRadius}
                    onChange={(e) => setDraftRadius(Number(e.target.value))}
                    className="w-full min-w-0 rounded-lg border border-[var(--paper-border)] bg-transparent px-2 py-2 text-sm"
                  >
                    {options.map((r) => (
                      <option key={r} value={r}>
                        {formatDistance(r)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!picked}
                  onClick={() => {
                    if (!picked) return
                    onChange({ ...picked, radiusMeters: draftRadius })
                    setOpen(false)
                  }}
                  className="shrink-0 self-end rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {picked ? 'Použiť toto miesto' : 'Ťukni na mapu'}
                </button>
              </div>
            )}
          />
        </Suspense>
      )}
    </div>
  )
}
