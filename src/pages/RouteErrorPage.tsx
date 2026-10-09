/** Nečakaná chyba pri zobrazení stránky (napr. nedostupná časť appky po deployi). */
export function RouteErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--color-bg)] px-6 text-center text-[var(--color-text)]">
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Niečo sa pokazilo
      </h1>
      <p className="text-sm text-[var(--color-muted)]">
        Appka sa možno práve aktualizovala. Skús stránku načítať znova.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 font-medium text-white transition hover:opacity-90"
      >
        Načítať znova
      </button>
    </div>
  )
}
