import { useState } from 'react'
import { verifyBlockLocation } from '../chapters/api'
import { formatDistance } from '../places/types'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'too_far'; distance: number | null }
  | { kind: 'denied' }
  | { kind: 'unavailable' }
  | { kind: 'failed' }

/**
 * Krok, za ktorým sa pokračuje až na mieste. Poloha sa pošle iba na
 * jednorazové porovnanie na serveri a nikde sa neukladá.
 */
export function BlockLocationGate({
  blockId,
  onPassed,
}: {
  blockId: string
  onPassed: () => void
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  function check() {
    if (!('geolocation' in navigator)) {
      setStatus({ kind: 'unavailable' })
      return
    }
    setStatus({ kind: 'checking' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        verifyBlockLocation(
          blockId,
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
        )
          .then((result) => {
            if (result.status === 'within_range') onPassed()
            else setStatus({ kind: 'too_far', distance: result.distanceMeters })
          })
          .catch(() => setStatus({ kind: 'failed' }))
      },
      (error) =>
        setStatus({
          kind: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  }

  return (
    <div className="paper flex flex-col gap-3 rounded-lg p-5">
      <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xs tracking-wider opacity-70">
        <span aria-hidden="true">📍</span> Ďalej až na mieste
      </p>
      <p>Keď budeš na mieste, klikni na tlačidlo — overím, že si tam.</p>

      {status.kind === 'too_far' && (
        <p className="text-sm text-rose-700">
          {status.distance !== null
            ? `Ešte tam nie si — chýba ti asi ${formatDistance(status.distance)}.`
            : 'Ešte tam nie si.'}
        </p>
      )}
      {status.kind === 'denied' && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Appka nemá povolenie zistiť polohu. Povoľ ho v nastaveniach prehliadača
          (nastavenia stránky → Poloha) a skús znova.
        </p>
      )}
      {status.kind === 'unavailable' && (
        <p className="text-sm text-rose-700">
          Polohu sa nepodarilo zistiť — skús to o chvíľu, najlepšie vonku.
        </p>
      )}
      {status.kind === 'failed' && (
        <p className="text-sm text-rose-700">
          Polohu sa nepodarilo overiť — skontroluj pripojenie na internet.
        </p>
      )}

      <button
        type="button"
        onClick={check}
        disabled={status.kind === 'checking'}
        className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {status.kind === 'checking'
          ? 'Zisťujem polohu…'
          : status.kind === 'idle'
            ? 'Skontrolovať polohu'
            : 'Skontrolovať znova'}
      </button>
      <p className="text-xs opacity-60">
        Poloha sa použije iba na toto overenie a nikde sa neukladá.
      </p>
    </div>
  )
}
