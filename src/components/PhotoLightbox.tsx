import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOverlay } from '../hooks/useOverlay'
import { BackButton, CloseButton } from './NavButtons'

export interface LightboxPhoto {
  src: string
  alt: string
  caption?: string | null
}

/** Najmenší vodorovný posun prstom, ktorý sa ráta ako swipe na ďalšiu fotku. */
const SWIPE_MIN_PX = 50

export function PhotoLightbox({
  photos,
  startIndex = 0,
  video = false,
  onClose,
}: {
  /** Viac fotiek sa dá listovať swipom do strán (alebo šípkami). */
  photos: LightboxPhoto[]
  startIndex?: number
  /** Video sa prehrá rovno (otvorené ťuknutím, takže aj so zvukom). */
  video?: boolean
  onClose: () => void
}) {
  useOverlay(onClose)
  const [index, setIndex] = useState(startIndex)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const count = photos.length
  const photo = photos[Math.min(index, count - 1)]

  const go = (delta: number) =>
    setIndex((i) => Math.min(Math.max(i + delta, 0), count - 1))

  useEffect(() => {
    if (count < 2) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, count - 1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [count])

  if (!photo) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Fotka"
      onClick={onClose}
      onTouchStart={(e) => {
        const t = e.touches[0]
        touchStart.current =
          e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current
        touchStart.current = null
        if (!start || count < 2) return
        const t = e.changedTouches[0]
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy))
          go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <BackButton light onClick={onClose}>
          Späť
        </BackButton>
        {count > 1 && (
          <span className="text-sm text-white/70">
            {index + 1} / {count}
          </span>
        )}
        <CloseButton light onClick={onClose} label="Zavrieť fotku" />
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
        {video ? (
          <video
            src={photo.src}
            controls
            autoPlay
            playsInline
            aria-label={photo.alt || 'Video'}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded"
          />
        ) : (
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full select-none rounded object-contain"
          />
        )}
        {count > 1 && (
          <>
            <ArrowButton side="left" disabled={index === 0} onClick={() => go(-1)} />
            <ArrowButton
              side="right"
              disabled={index === count - 1}
              onClick={() => go(1)}
            />
          </>
        )}
      </div>
      <p className="min-h-16 px-6 pb-8 pt-3 text-center text-sm italic text-white/85">
        {photo.caption}
      </p>
    </div>,
    document.body,
  )
}

function ArrowButton({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      aria-label={side === 'left' ? 'Predchádzajúca fotka' : 'Ďalšia fotka'}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl text-white disabled:invisible ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
    >
      <span aria-hidden="true">{side === 'left' ? '‹' : '›'}</span>
    </button>
  )
}
