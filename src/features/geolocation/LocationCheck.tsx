import { useState } from 'react'
import { verifyLocation } from '../chapters/api'

type Status = 'idle' | 'checking' | 'within_range' | 'too_far' | 'unavailable'

interface LocationCheckProps {
  chapterId: string
  conditionId: string | null
  successMessage?: string | null
  failureMessage?: string | null
  onCompleted: () => void
}

export function LocationCheck({
  chapterId,
  conditionId,
  successMessage,
  failureMessage,
  onCompleted,
}: LocationCheckProps) {
  const [status, setStatus] = useState<Status>('idle')

  function check() {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }

    setStatus('checking')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void verifyLocation(
          chapterId,
          conditionId,
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
        )
          .then((result) => {
            setStatus(result.status)
            if (result.status === 'within_range') onCompleted()
          })
          .catch(() => setStatus('unavailable'))
      },
      () => setStatus('unavailable'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-5 shadow-sm">
      <p className="text-sm text-[var(--color-muted)]">
        Táto kapitola sa odomkne, keď budeš na správnom mieste. Poloha sa použije iba na
        jednorazové overenie a nikde sa neukladá.
      </p>

      {status === 'within_range' && (
        <p className="animate-unlock font-medium text-[var(--color-accent)]">
          {successMessage ?? 'Si na správnom mieste.'}
        </p>
      )}
      {status === 'too_far' && (
        <p className="text-sm text-rose-600">{failureMessage ?? 'Príliš ďaleko.'}</p>
      )}
      {status === 'unavailable' && (
        <p className="text-sm text-rose-600">
          Poloha sa nepodarila zistiť. Skontroluj povolenie polohy v prehliadači a skús
          znova, alebo požiadaj o ručné odomknutie.
        </p>
      )}

      {status !== 'within_range' && (
        <button
          onClick={check}
          disabled={status === 'checking'}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {status === 'checking'
            ? 'Zisťujem polohu…'
            : status === 'idle'
              ? 'Skontrolovať polohu'
              : 'Skontrolovať znova'}
        </button>
      )}
    </div>
  )
}
