import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--color-bg)] px-6 text-center text-[var(--color-text)]">
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Stránka nenájdená
      </h1>
      <p className="text-sm text-[var(--color-muted)]">
        Táto cesta v príbehu zatiaľ neexistuje.
      </p>
      <Link to="/" className="text-sm text-[var(--color-accent)] underline">
        Späť na úvod
      </Link>
    </div>
  )
}
