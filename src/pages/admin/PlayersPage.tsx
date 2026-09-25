import { useEffect, useState } from 'react'
import { Layout } from '../../components/Layout'
import {
  adminGetPlayerProgress,
  adminListChapters,
  adminListPlayers,
  adminResetProgress,
  adminSetChapterStatus,
} from '../../features/admin/api'
import type { ChapterRow, ProfileRow } from '../../features/admin/api'

const STATUS_OPTIONS = ['locked', 'unlocked', 'completed'] as const

interface Row {
  chapterId: string
  title: string
  status: (typeof STATUS_OPTIONS)[number]
  attemptCount: number
}

export function PlayersPage() {
  const [players, setPlayers] = useState<ProfileRow[]>([])
  const [selected, setSelected] = useState<ProfileRow | null>(null)
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    void adminListPlayers().then(setPlayers)
  }, [])

  async function loadRows(playerId: string) {
    const [chapters, progress] = await Promise.all([
      adminListChapters(),
      adminGetPlayerProgress(playerId),
    ])
    const progressByChapter = new Map(progress.map((p) => [p.chapter_id, p]))

    setRows(
      chapters.map((chapter: ChapterRow) => {
        const p = progressByChapter.get(chapter.id)
        return {
          chapterId: chapter.id,
          title: chapter.title,
          status: (p?.status as Row['status']) ?? 'locked',
          attemptCount: p?.attempt_count ?? 0,
        }
      }),
    )
  }

  async function openPlayer(player: ProfileRow) {
    setSelected(player)
    await loadRows(player.id)
  }

  async function setStatus(chapterId: string, status: Row['status']) {
    if (!selected) return
    await adminSetChapterStatus(selected.id, chapterId, status)
    await loadRows(selected.id)
  }

  async function resetAll() {
    if (!selected) return
    if (
      !confirm(
        `Naozaj vynulovať celý postup hráčky ${selected.display_name ?? selected.email}?`,
      )
    ) {
      return
    }
    await adminResetProgress(selected.id)
    await loadRows(selected.id)
  }

  return (
    <Layout>
      <h1 className="mb-4 font-[family-name:var(--font-display)] text-xl">Hráčky</h1>

      <ul className="mb-6 flex flex-col gap-2">
        {players.map((player) => (
          <li key={player.id}>
            <button
              onClick={() => void openPlayer(player)}
              className={`w-full rounded-xl p-3 text-left shadow-sm ${
                selected?.id === player.id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface)]'
              }`}
            >
              {player.display_name ?? player.email}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">
              Postup — {selected.display_name ?? selected.email}
            </h2>
            <button onClick={resetAll} className="text-sm text-rose-600 underline">
              Vynulovať postup
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li
                key={row.chapterId}
                className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] p-3 shadow-sm"
              >
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    pokusov: {row.attemptCount}
                  </p>
                </div>
                <select
                  value={row.status}
                  onChange={(e) =>
                    void setStatus(row.chapterId, e.target.value as Row['status'])
                  }
                  className="rounded-lg border border-rose-200 bg-transparent px-2 py-1 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Layout>
  )
}
