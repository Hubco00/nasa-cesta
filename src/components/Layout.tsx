import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { OfflineBanner } from './OfflineBanner'

export function Layout({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth()
  const { profile } = useProfile()
  const { pathname } = useLocation()
  const inAdmin = pathname.startsWith('/admin')

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <OfflineBanner />
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-rose-200/40 bg-[var(--color-bg)]/90 px-4 py-3 backdrop-blur">
        <Link to="/chapters" className="font-[family-name:var(--font-display)] text-lg">
          Naša cesta
        </Link>
        {session && (
          <div className="flex items-center gap-3">
            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                aria-current={inAdmin ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  inAdmin
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white'
                }`}
              >
                Admin panel
              </Link>
            )}
            <button
              onClick={() => void signOut()}
              className="text-sm text-[var(--color-muted)] underline-offset-2 hover:underline"
            >
              Odhlásiť sa
            </button>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
