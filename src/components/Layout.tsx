import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { OfflineBanner } from './OfflineBanner'

export function Layout({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <OfflineBanner />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-rose-200/40 bg-[var(--color-bg)]/90 px-4 py-3 backdrop-blur">
        <span className="font-[family-name:var(--font-display)] text-lg">Naša cesta</span>
        {session && (
          <button
            onClick={() => void signOut()}
            className="text-sm text-[var(--color-muted)] underline-offset-2 hover:underline"
          >
            Odhlásiť sa
          </button>
        )}
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
