import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { toLoginEmail } from '../lib/login'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function LoginPage() {
  const { session, loading: sessionLoading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/chapters'

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!sessionLoading && session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: toLoginEmail(name),
      password,
    })
    setSubmitting(false)
    if (signInError) {
      setError('Nesprávne meno alebo heslo.')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-8 shadow-lg shadow-rose-900/5">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">
          Naša cesta
        </h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Prihlás sa a pokračuj v príbehu.
        </p>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
            Supabase nie je nakonfigurované. Skopíruj <code>.env.example</code> do{' '}
            <code>.env.local</code> a doplň hodnoty.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
            Meno
            <input
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-rose-200 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
            Heslo
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-rose-200 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Prihlasujem…' : 'Prihlásiť sa'}
          </button>
        </form>
      </div>
    </div>
  )
}
