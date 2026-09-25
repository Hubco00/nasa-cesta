import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import {
  adminContentSummary,
  adminDeleteChapter,
  adminListChapters,
  adminSwapChapterOrder,
  adminUpdateChapter,
} from '../features/admin/api'
import type { ChapterContentSummary, ChapterRow } from '../features/admin/api'
import { findCity } from '../features/map/cities'
import { getErrorMessage } from '../lib/errors'

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

  const [error, setError] = useState<string | null>(null)

  async function remove(chapter: ChapterRow) {
    const ok = confirm(
      `Zmazať kapitolu „${chapter.title}“ aj s celým obsahom (príbehy, fotky, otázky, ` +
        'miesta na mape) a postupom hráčky v nej? Nedá sa to vrátiť.',
    )
    if (!ok) return
    setError(null)
    try {
      await adminDeleteChapter(chapter.id)
      await reload()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

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
    <Layout back={{ to: '/chapters', label: 'Naša cesta' }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-xl">Kapitoly</h1>
        <div className="flex gap-3 text-sm">
          <Link to="/admin/mapa" className="text-[var(--color-accent)] underline">
            Mapa kapitol
          </Link>
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
      {error && <p className="mb-3 text-sm text-rose-600">Zmazanie zlyhalo: {error}</p>}

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
              {(chapter.required_chapter_id || chapter.required_block_id) && (
                <span className="text-xs text-[var(--color-muted)]">
                  odomkne sa po:{' '}
                  {[
                    chapter.required_chapter_id &&
                      `„${chapters.find((c) => c.id === chapter.required_chapter_id)?.title ?? '?'}“`,
                    chapter.required_block_id && 'správnej odpovedi na otázku',
                  ]
                    .filter(Boolean)
                    .join(' + ')}
                  {chapter.hidden_until_unlocked && ' · dovtedy skrytá na mape'}
                </span>
              )}
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
                {chapter.is_published ? 'Publikované' : 'Nepublikované'}
              </button>
              <button
                onClick={() => void remove(chapter)}
                className="rounded px-1 text-sm text-rose-600"
                aria-label={`Zmazať kapitolu ${chapter.title}`}
                title="Zmazať kapitolu"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Layout>
  )
}
