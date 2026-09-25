import { useEffect, useRef, useState } from 'react'
import { ChapterBlockRenderer } from '../chapters/ChapterBlockRenderer'
import { fetchPinBlocks } from '../chapters/api'
import type { ChapterBlock, MapPin } from '../chapters/types'
import { findCity, MAP_IMAGE_HEIGHT, MAP_IMAGE_SRC, MAP_IMAGE_WIDTH } from './cities'
import { loadSeenPins, markPinSeen } from './seenPins'

export function ChapterMap({
  pins,
  chapterTitle,
}: {
  pins: MapPin[]
  chapterTitle: string
}) {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(() => loadSeenPins())

  const visiblePins = pins.filter((p) => findCity(p.city_key))
  if (visiblePins.length === 0) return null

  const unseenCount = visiblePins.filter((p) => !seen.has(p.id)).length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="paper relative flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3.5 font-[family-name:var(--font-display)] text-base transition hover:-translate-y-0.5"
      >
        <MapIcon className="h-5 w-5" />
        Mapa
        {unseenCount > 0 && (
          <span
            className="map-badge absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-[family-name:var(--font-body)] text-xs font-semibold text-[var(--color-rose-900)]"
            aria-label={`${unseenCount} nových miest`}
          >
            {unseenCount}
          </span>
        )}
      </button>

      {open && (
        <MapOverlay
          pins={visiblePins}
          seen={seen}
          chapterTitle={chapterTitle}
          onSeen={(id) => setSeen(markPinSeen(id))}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function MapOverlay({
  pins,
  seen,
  chapterTitle,
  onSeen,
  onClose,
}: {
  pins: MapPin[]
  seen: Set<string>
  chapterTitle: string
  onSeen: (pinId: string) => void
  onClose: () => void
}) {
  const [activePin, setActivePin] = useState<MapPin | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  // Na mobile je mapa širšia ako displej — posuň ju na prvé ešte neotvorené miesto.
  useEffect(() => {
    const scroller = scrollRef.current
    const map = mapRef.current
    if (!scroller || !map) return
    const target = pins.find((p) => !seen.has(p.id)) ?? pins[0]
    const city = findCity(target.city_key)
    if (!city) return
    scroller.scrollLeft = (city.x / 100) * map.offsetWidth - scroller.clientWidth / 2
    // Iba pri otvorení mapy, nie pri každej zmene "videných" miest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function openPin(pin: MapPin) {
    setActivePin(pin)
    onSeen(pin.id)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Mapa — ${chapterTitle}`}
    >
      <header className="flex items-center justify-between border-b border-[var(--paper-border)] px-4 py-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg">Mapa</p>
          <p className="text-sm text-[var(--color-muted)]">{chapterTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm text-[var(--color-accent)] hover:underline"
        >
          Zavrieť ✕
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex flex-1 items-center overflow-x-auto overflow-y-hidden"
      >
        <div
          ref={mapRef}
          className="relative mx-auto shrink-0"
          style={{
            height: 'min(78dvh, 752px)',
            aspectRatio: `${MAP_IMAGE_WIDTH} / ${MAP_IMAGE_HEIGHT}`,
          }}
        >
          <img
            src={MAP_IMAGE_SRC}
            alt="Mapa Kráľovstva Slovensko"
            className="absolute inset-0 h-full w-full select-none rounded-sm"
            draggable={false}
          />

          {pins.map((pin) => {
            const city = findCity(pin.city_key)!
            const isNew = !seen.has(pin.id)
            return (
              <button
                key={pin.id}
                onClick={() => openPin(pin)}
                className={`map-bubble absolute ${isNew ? 'map-bubble--new' : 'map-bubble--seen'}`}
                style={{ left: `${city.x}%`, top: `${city.y}%` }}
                aria-label={`${city.label}${isNew ? ' — nové' : ''}`}
              >
                <span className="map-bubble__dot" />
              </button>
            )
          })}
        </div>
      </div>

      <p className="px-4 pb-4 pt-2 text-center text-xs text-[var(--color-muted)]">
        Ťukni na guličku pri meste.
      </p>

      {activePin && <PinSheet pin={activePin} onClose={() => setActivePin(null)} />}
    </div>
  )
}

function PinSheet({ pin, onClose }: { pin: MapPin; onClose: () => void }) {
  const [blocks, setBlocks] = useState<ChapterBlock[] | null>(null)
  const [failed, setFailed] = useState(false)
  const city = findCity(pin.city_key)

  useEffect(() => {
    let active = true
    fetchPinBlocks(pin.id)
      .then((rows) => {
        if (active) setBlocks(rows)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [pin.id])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-[var(--color-bg)] px-4 pb-8 pt-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            {city?.label}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-[var(--color-accent)] hover:underline"
          >
            Späť na mapu
          </button>
        </div>

        {failed && (
          <p className="text-sm text-rose-600">
            Obsah sa nepodarilo načítať. Skontroluj pripojenie a skús to znova.
          </p>
        )}
        {!failed && blocks === null && (
          <p className="text-sm text-[var(--color-muted)]">Načítavam…</p>
        )}
        {blocks && blocks.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">Tu zatiaľ nič nie je.</p>
        )}
        {blocks && blocks.length > 0 && <ChapterBlockRenderer blocks={blocks} />}
      </div>
    </div>
  )
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}
