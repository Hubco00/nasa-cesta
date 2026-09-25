/** Hláška pri zlyhanom načítaní (napr. výpadok siete) s možnosťou skúsiť znova. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-[var(--color-muted)]">
        Nepodarilo sa načítať. Skontroluj pripojenie na internet.
      </p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
      >
        Skúsiť znova
      </button>
    </div>
  )
}
