import { useEffect, useState } from 'react'
import { PhotoLightbox } from '../../components/PhotoLightbox'
import { getSignedPhotoUrls } from '../../lib/storage'

/** Fotka s popiskom; ťuknutie ju otvorí na celú obrazovku. */
export function PhotoFigure({
  storagePath,
  alt,
  caption,
}: {
  storagePath: string
  alt?: string | null
  caption?: string | null
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true
    getSignedPhotoUrls([storagePath]).then((urls) => {
      if (active) setUrl(urls[storagePath] ?? null)
    })
    return () => {
      active = false
    }
  }, [storagePath])

  return (
    <figure className="overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-sm">
      {url ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Zobraziť fotku na celú obrazovku"
          className="block w-full cursor-zoom-in"
        >
          <img
            src={url}
            alt={alt ?? ''}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
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
