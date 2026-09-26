import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BackButton, CloseButton } from '../../components/NavButtons'
import { useOverlay } from '../../hooks/useOverlay'
import { PlaceMap } from './PlaceMap'
import type { LatLng } from './types'

/**
 * Celoobrazovková mapa na výber miesta — pre hráčku (odpoveď na otázku) aj
 * pre admina (správne miesto + tolerancia). Načítava sa lenivo, aby Leaflet
 * nebol v hlavnom bundli.
 */
export default function PlacePickerOverlay({
  title,
  backLabel,
  initial,
  radiusMeters,
  onClose,
  footer,
}: {
  title: string
  backLabel: string
  initial: LatLng | null
  radiusMeters?: number
  onClose: () => void
  /** Spodná lišta — dostane aktuálne vybrané miesto. */
  footer: (place: LatLng | null) => ReactNode
}) {
  useOverlay(onClose)
  const [place, setPlace] = useState<LatLng | null>(initial)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]"
    >
      <div className="flex items-center gap-2 border-b border-[var(--paper-border)] px-3 py-2">
        <BackButton onClick={onClose}>{backLabel}</BackButton>
        <p className="min-w-0 flex-1 truncate text-center font-[family-name:var(--font-display)]">
          {title}
        </p>
        <CloseButton onClick={onClose} />
      </div>

      <PlaceMap value={place} onPick={setPlace} radiusMeters={radiusMeters} />

      <div className="border-t border-[var(--paper-border)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {footer(place)}
      </div>
    </div>,
    document.body,
  )
}
