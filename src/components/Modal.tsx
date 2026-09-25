import { useEffect, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--color-bg)] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--paper-border)] px-5 py-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Zavrieť"
            className="rounded-lg px-2 py-1 text-lg text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
