import { useEffect, useState } from 'react'
import { PhotoLightbox } from '../../components/PhotoLightbox'
import { isVideoPath, withFirstFrame } from '../../lib/media'
import { getSignedPhotoUrls } from '../../lib/storage'

interface PhotoProps {
  storagePath: string
  alt?: string | null
  caption?: string | null
}

function useSignedUrls(storagePaths: string[]) {
  const key = storagePaths.join('\n')
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    getSignedPhotoUrls(key ? key.split('\n') : [], { fresh: attempt > 0 }).then(
      (signed) => {
        if (active) setUrls(signed)
      },
    )
    return () => {
      active = false
    }
  }, [key, attempt])
  // Keď URL predsa neplatí (napr. vypršala), video si vypýta novú (raz).
  const refresh = () => {
    if (attempt === 0) setAttempt(1)
  }
  return { urls, refresh }
}

function useSignedUrl(storagePath: string) {
  const { urls, refresh } = useSignedUrls([storagePath])
  return { url: urls[storagePath] ?? null, refresh }
}

/** Video priamo v liste — prehrá sa na mieste, so zvukom a ovládaním. */
function InlineVideo({
  url,
  label,
  className,
  onError,
}: {
  url: string
  label: string
  className: string
  onError: () => void
}) {
  return (
    <video
      src={withFirstFrame(url)}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      onError={onError}
      className={`${className} bg-black object-contain`}
    />
  )
}

/** Samostatná fotka (karta s popiskom); ťuknutie ju otvorí na celú obrazovku. */
export function PhotoFigure({ storagePath, alt, caption }: PhotoProps) {
  const { url, refresh } = useSignedUrl(storagePath)
  const [open, setOpen] = useState(false)
  const video = isVideoPath(storagePath)

  return (
    <figure className="overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-sm">
      {url && video ? (
        <InlineVideo
          url={url}
          label={alt || caption || 'Video'}
          className="max-h-[75vh] w-full"
          onError={refresh}
        />
      ) : url ? (
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
      {open && url && !video && (
        <PhotoLightbox
          photos={[{ src: url, alt: alt ?? '', caption }]}
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
  const { urls, refresh } = useSignedUrls(photos.map((p) => p.storagePath))
  const [open, setOpen] = useState<number | null>(null)
  if (photos.length === 0) return null
  const grid = photos.length > 1

  // Na celej obrazovke sa listuje iba medzi fotkami — videá sa hrajú v liste.
  const gallery = photos
    .filter((p) => !isVideoPath(p.storagePath) && urls[p.storagePath])
    .map((p) => ({
      storagePath: p.storagePath,
      src: urls[p.storagePath],
      alt: p.alt ?? '',
      caption: p.caption,
    }))

  return (
    <div className={`mt-5 grid gap-4 ${grid ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {photos.map((photo) => (
        <LetterPhoto
          key={photo.storagePath}
          {...photo}
          url={urls[photo.storagePath] ?? null}
          refresh={refresh}
          square={grid}
          onOpen={() => {
            const i = gallery.findIndex((g) => g.storagePath === photo.storagePath)
            if (i >= 0) setOpen(i)
          }}
        />
      ))}
      {open !== null && (
        <PhotoLightbox photos={gallery} startIndex={open} onClose={() => setOpen(null)} />
      )}
    </div>
  )
}

function LetterPhoto({
  storagePath,
  alt,
  caption,
  url,
  refresh,
  square,
  onOpen,
}: PhotoProps & {
  url: string | null
  refresh: () => void
  square: boolean
  onOpen: () => void
}) {
  const aspect = square ? 'aspect-square' : 'aspect-[4/3]'

  if (isVideoPath(storagePath)) {
    return (
      <figure className="flex flex-col gap-1.5">
        <div className="rounded-sm bg-white/60 p-1.5 shadow-[0_6px_14px_-8px_rgba(74,26,36,0.55)] ring-1 ring-[var(--paper-border)] dark:bg-white/10">
          {url ? (
            <InlineVideo
              url={url}
              label={alt || caption || 'Video'}
              className={`${square ? 'aspect-square' : 'max-h-[70vh]'} w-full rounded-[2px]`}
              onError={refresh}
            />
          ) : (
            <div className={`${aspect} w-full animate-pulse rounded-[2px] bg-black/5`} />
          )}
        </div>
        {caption && (
          <figcaption className="px-1 text-center text-sm italic leading-snug opacity-80">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => url && onOpen()}
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
