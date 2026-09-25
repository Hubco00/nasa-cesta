import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { ChapterMapPath } from '../features/chapters/ChapterMapPath'
import { fetchTimeline } from '../features/chapters/api'
import type { TimelineEntry } from '../features/chapters/types'

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
      <h1 className="mb-6 text-center font-[family-name:var(--font-display)] text-xl text-[var(--color-text)]">
        Naša cesta
      </h1>

      {loading && (
        <p className="text-center text-sm text-[var(--color-muted)]">Načítavam…</p>
      )}

      {!loading && entries.length === 0 && (
        <p className="text-center text-sm text-[var(--color-muted)]">
          Zatiaľ tu nie sú žiadne kapitoly.
        </p>
      )}

      {!loading && <ChapterMapPath entries={entries} />}
    </Layout>
  )
}
