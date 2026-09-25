import { createPortal } from 'react-dom'
import { useOverlay } from '../hooks/useOverlay'
import { BackButton, CloseButton } from './NavButtons'

export function PhotoLightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string
  alt: string
  caption?: string | null
  onClose: () => void
}) {
  useOverlay(onClose)

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Fotka"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <BackButton light onClick={onClose}>
          Späť
        </BackButton>
        <CloseButton light onClick={onClose} label="Zavrieť fotku" />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <img
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded object-contain"
        />
      </div>
      <p className="min-h-16 px-6 pb-8 pt-3 text-center text-sm italic text-white/85">
        {caption}
      </p>
    </div>,
    document.body,
  )
}
