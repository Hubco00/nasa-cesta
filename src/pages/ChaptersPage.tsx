import { Layout } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'

export function ChaptersPage() {
  const { user } = useAuth()

  return (
    <Layout>
      <div className="animate-unlock rounded-2xl bg-[var(--color-surface)] p-6 shadow-sm">
        <h1 className="mb-2 font-[family-name:var(--font-display)] text-xl">
          Vitaj, {user?.email}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Zoznam kapitol príde vo Fáze 3 (hráčska časť).
        </p>
      </div>
    </Layout>
  )
}
