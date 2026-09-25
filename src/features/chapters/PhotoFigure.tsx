import { useEffect, useState } from 'react'
import { PhotoLightbox } from '../../components/PhotoLightbox'
import { getSignedPhotoUrls } from '../../lib/storage'

interface PhotoProps {
  storagePath: string
  alt?: string | null
  caption?: string | null
}

function useSignedUrl(storagePath: string) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    getSignedPhotoUrls([storagePath]).then((urls) => {
      if (active) setUrl(urls[storagePath] ?? null)
    })
    return () => {
      active = false
    }
  }, [storagePath])
  return url
}

/** Samostatná fotka (karta s popiskom); ťuknutie ju otvorí na celú obrazovku. */
export function PhotoFigure({ storagePath, alt, caption }: PhotoProps) {
  const url = useSignedUrl(storagePath)
  const [open, setOpen] = useState(false)

  return (
    <figure className="overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-sm">
      {url ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Zobraziť fotku na celú obrazovku"
          className="relative block w-full cursor-zoom-in"
        >
          <img
            src={url}
            alt={alt ?? ''}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
          <ExpandBadge />
        </button>
      ) : (
        <div className="aspect-[4/3] w-full animate-pulse bg-rose-100" />
      )}
      {caption && (
        <figcaption className="px-4 py-3 text-sm italic text-[var(--color-muted)]">
          {caption}
        </figcaption>
      )}
      {open && url && (
        <PhotoLightbox
          src={url}
          alt={alt ?? ''}
          caption={caption}
          onClose={() => setOpen(false)}
        />
      )}
    </figure>
  )
}

/**
 * Fotky vložené priamo do listu (pod text príbehu) — v jemnom ráme ako
 * fotka priložená k listu. Jedna fotka na celú šírku, viac v mriežke.
 */
export function LetterPhotos({ photos }: { photos: PhotoProps[] }) {
  if (photos.length === 0) return null
  const grid = photos.length > 1

  return (
    <div className={`mt-5 grid gap-4 ${grid ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {photos.map((photo) => (
        <LetterPhoto key={photo.storagePath} {...photo} square={grid} />
      ))}
    </div>
  )
}

function LetterPhoto({
  storagePath,
  alt,
  caption,
  square,
}: PhotoProps & { square: boolean }) {
  const url = useSignedUrl(storagePath)
  const [open, setOpen] = useState(false)
  const aspect = square ? 'aspect-square' : 'aspect-[4/3]'

  return (
    <figure className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => url && setOpen(true)}
        aria-label="Zobraziť fotku na celú obrazovku"
        className="relative block cursor-zoom-in rounded-sm bg-white/60 p-1.5 shadow-[0_6px_14px_-8px_rgba(74,26,36,0.55)] ring-1 ring-[var(--paper-border)] dark:bg-white/10"
      >
        {url ? (
          <img
            src={url}
            alt={alt ?? ''}
            className={`${aspect} w-full rounded-[2px] object-cover`}
            loading="lazy"
          />
        ) : (
          <div className={`${aspect} w-full animate-pulse rounded-[2px] bg-black/5`} />
        )}
        {url && <ExpandBadge />}
      </button>
      {caption && (
        <figcaption className="px-1 text-center text-sm italic leading-snug opacity-80">
          {caption}
        </figcaption>
      )}
      {open && url && (
        <PhotoLightbox
          src={url}
          alt={alt ?? ''}
          caption={caption}
          onClose={() => setOpen(false)}
        />
      )}
    </figure>
  )
}

/** Malá ikonka v rohu fotky — napovie, že sa dá rozkliknúť. */
function ExpandBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
