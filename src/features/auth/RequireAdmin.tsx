import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, loading, error } = useProfile()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--color-muted)]">
        Overujem oprávnenia…
      </div>
    )
  }

  if (error || profile?.role !== 'admin') {
    return <Navigate to="/chapters" replace />
  }

  return <>{children}</>
}
