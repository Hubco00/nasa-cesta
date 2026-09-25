import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { fetchTimeline } from '../features/chapters/api'
import type { TimelineEntry } from '../features/chapters/types'

const STATUS_LABEL: Record<string, string> = {
  locked: 'Zamknuté',
  unlocked: 'Čaká na teba',
  completed: 'Splnené',
}

export function ChaptersPage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchTimeline().then((data) => {
      if (active) {
        setEntries(data)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Layout>
      <h1 className="mb-4 font-[family-name:var(--font-display)] text-xl text-[var(--color-text)]">
        Naša cesta
      </h1>

      {loading && <p className="text-sm text-[var(--color-muted)]">Načítavam…</p>}

      {!loading && entries.length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">
          Zatiaľ tu nie sú žiadne kapitoly.
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {entries.map((entry, index) => {
          const locked = entry.status === 'locked'
          const content = (
            <div
              className={`animate-fade-in-up flex items-center justify-between rounded-2xl p-4 shadow-sm transition ${
                locked
                  ? 'bg-[var(--color-surface)]/50 text-[var(--color-muted)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:opacity-90'
              }`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div>
                <p className="font-medium">{entry.title}</p>
                {entry.description && !locked && (
                  <p className="text-sm text-[var(--color-muted)]">{entry.description}</p>
                )}
              </div>
              <span className="shrink-0 text-xs">
                {entry.status === 'completed' ? '✓ ' : ''}
                {STATUS_LABEL[entry.status] ?? entry.status}
              </span>
            </div>
          )

          return (
            <li key={entry.chapter_id}>
              {locked ? content : <Link to={`/chapters/${entry.slug}`}>{content}</Link>}
            </li>
          )
        })}
      </ol>
    </Layout>
  )
}
