import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { ChapterMapPath } from '../features/chapters/ChapterMapPath'
import { fetchRoadSegments, fetchTimeline } from '../features/chapters/api'
import type { RoadSegment, TimelineEntry } from '../features/chapters/types'

export function ChaptersPage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [segments, setSegments] = useState<RoadSegment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([fetchTimeline(), fetchRoadSegments()]).then(([data, roads]) => {
      if (active) {
        setEntries(data)
        setSegments(roads)
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

      {!loading && <ChapterMapPath entries={entries} segments={segments} />}
    </Layout>
  )
}
