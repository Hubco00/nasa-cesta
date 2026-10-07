import { withFirstFrame } from '../lib/media'

/** Malý náhľad fotky alebo videa (admin) — video s ikonou prehrávania. */
export function MediaThumb({
  src,
  video,
  className = 'h-14 w-14',
}: {
  src: string
  video: boolean
  className?: string
}) {
  if (!video) {
    return (
      <img src={src} alt="" className={`${className} shrink-0 rounded object-cover`} />
    )
  }
  return (
    <span
      className={`${className} relative block shrink-0 overflow-hidden rounded bg-black`}
    >
      <video
        src={withFirstFrame(src)}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-lg text-white drop-shadow"
      >
        ▶
      </span>
    </span>
  )
}
