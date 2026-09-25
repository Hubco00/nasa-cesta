import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ChapterActionPanel } from '../features/chapters/ChapterActionPanel'
import { ChapterBlockRenderer } from '../features/chapters/ChapterBlockRenderer'
import {
  fetchChapterBlocks,
  fetchChapterBySlug,
  fetchChapterMapPins,
  fetchProgressStatus,
} from '../features/chapters/api'
import type { ChapterBlock, ChapterDetail, MapPin } from '../features/chapters/types'
import { ChapterMap } from '../features/map/ChapterMap'

export function ChapterDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [chapter, setChapter] = useState<ChapterDetail | null>(null)
  const [blocks, setBlocks] = useState<ChapterBlock[]>([])
  const [pins, setPins] = useState<MapPin[]>([])
  const [status, setStatus] = useState<string>('locked')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let active = true

    async function load() {
      const found = await fetchChapterBySlug(slug!)
      if (!active) return
      if (!found) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const [blockRows, pinRows, progressStatus] = await Promise.all([
        fetchChapterBlocks(found.id!),
        fetchChapterMapPins(found.id!),
        fetchProgressStatus(found.id!),
      ])
      if (!active) return
      setChapter(found)
      setBlocks(blockRows)
      setPins(pinRows)
      setStatus(progressStatus)
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <Layout back={{ to: '/chapters', label: 'Späť na cestu' }}>
        <p className="text-sm text-[var(--color-muted)]">Načítavam kapitolu…</p>
      </Layout>
    )
  }

  if (notFound || !chapter) {
    return (
      <Layout back={{ to: '/chapters', label: 'Späť na cestu' }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <p>Táto kapitola zatiaľ nie je dostupná.</p>
        </div>
      </Layout>
    )
  }

  if (status === 'locked') {
    return (
      <Layout back={{ to: '/chapters', label: 'Späť na cestu' }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-[var(--color-muted)]">Táto kapitola je zatiaľ zamknutá.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout back={{ to: '/chapters', label: 'Späť na cestu' }}>
      <div
        className={
          chapter.is_final ? 'flex flex-col gap-6 text-center' : 'flex flex-col gap-6'
        }
      >
        <header>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">
            {chapter.title}
          </h1>
          {chapter.description && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {chapter.description}
            </p>
          )}
        </header>

        <ChapterBlockRenderer blocks={blocks} />

        <ChapterMap pins={pins} chapterTitle={chapter.title ?? ''} />

        {status === 'completed' ? (
          <p className="rounded-2xl bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted)] shadow-sm">
            ✓ Táto kapitola je splnená.
          </p>
        ) : (
          <ChapterActionPanel
            chapter={chapter}
            onCompleted={() => {
              setStatus('completed')
              if (!chapter.is_final) {
                setTimeout(() => navigate('/chapters'), 1200)
              }
            }}
          />
        )}
      </div>
    </Layout>
  )
}
