import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { BackLink } from '../components/NavButtons'
import {
  adminContentSummary,
  adminListChapters,
  adminSwapChapterOrder,
  adminUpdateChapter,
} from '../features/admin/api'
import type { ChapterContentSummary, ChapterRow } from '../features/admin/api'
import { findCity } from '../features/map/cities'

const UNLOCK_LABEL: Record<string, string> = {
  manual: 'manuál',
  qr_code: 'QR kód',
  location: 'GPS poloha',
  question: 'otázka',
  combined: 'kombinované',
  admin: 'admin odomkne',
}

export function AdminPage() {
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [summary, setSummary] = useState<Record<string, ChapterContentSummary>>({})
  const [loading, setLoading] = useState(true)

  async function reload() {
    const [rows, content] = await Promise.all([
      adminListChapters(),
      adminContentSummary(),
    ])
    setChapters(rows)
    setSummary(content)
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
  }, [])

  async function togglePublished(chapter: ChapterRow) {
    await adminUpdateChapter(chapter.id, { is_published: !chapter.is_published })
    await reload()
  }

  async function move(index: number, direction: -1 | 1) {
    const other = chapters[index + direction]
    if (!other) return
    await adminSwapChapterOrder(chapters[index], other)
    await reload()
  }

  return (
    <Layout>
      <BackLink to="/chapters">Naša cesta</BackLink>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-xl">Kapitoly</h1>
        <div className="flex gap-3 text-sm">
          <Link to="/admin/players" className="text-[var(--color-accent)] underline">
            Hráčky
          </Link>
          <Link
            to="/admin/chapters/new"
            className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 font-medium text-white"
          >
            + Nová kapitola
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--color-muted)]">Načítavam…</p>}

      <ul className="flex flex-col gap-2">
        {chapters.map((chapter, index) => (
          <li
            key={chapter.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface)] p-3 shadow-sm"
          >
            <div className="flex flex-col">
              <Link
                to={`/admin/chapters/${chapter.id}`}
                className="font-medium text-[var(--color-text)] hover:underline"
              >
                {chapter.title}
              </Link>
              <span className="text-xs text-[var(--color-muted)]">
                {UNLOCK_LABEL[chapter.unlock_type] ?? chapter.unlock_type}
                {chapter.is_final ? ' · finálna' : ''}
                {' · '}
                {summary[chapter.id]?.storyBlocks ?? 0} položiek v liste
              </span>
              {(summary[chapter.id]?.pinCities.length ?? 0) > 0 && (
                <span className="text-xs text-[var(--color-muted)]">
                  mapa:{' '}
                  {summary[chapter.id].pinCities
                    .map((key) => findCity(key)?.label ?? key)
                    .join(', ')}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="rounded px-2 py-1 text-sm disabled:opacity-30"
                aria-label="Posunúť vyššie"
              >
                ↑
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === chapters.length - 1}
                className="rounded px-2 py-1 text-sm disabled:opacity-30"
                aria-label="Posunúť nižšie"
              >
                ↓
              </button>
              <button
                onClick={() => togglePublished(chapter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  chapter.is_published
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {chapter.is_published ? 'Publikované' : 'Skryté'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Layout>
  )
}
