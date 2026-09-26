import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProfile } from '../../hooks/useProfile'
import { getErrorMessage } from '../../lib/errors'
import { BlockLocationGate } from '../geolocation/BlockLocationGate'
import { ChapterActionPanel } from './ChapterActionPanel'
import { BlockNodeView, type Reveal } from './ChapterBlockRenderer'
import {
  completeBlockStep,
  fetchChapterBlocks,
  fetchSolvedBlocks,
  fetchStepCount,
} from './api'
import { stepsOf, type BlockNode } from './blockTree'
import type { ChapterBlock, ChapterDetail } from './types'

/**
 * Hlavný list kapitoly po krokoch — vždy jeden príbeh/fotka/otázka/QR kód.
 * Ďalší krok server vydá až po splnení predchádzajúceho, takže tu stačí
 * po splnení znova načítať bloky. Na konci je záverečná akcia kapitoly.
 */
export function ChapterSteps({
  chapter,
  initialBlocks,
  status,
  onChapterCompleted,
}: {
  chapter: ChapterDetail
  initialBlocks: ChapterBlock[]
  status: string
  onChapterCompleted: () => void
}) {
  const chapterId = chapter.id!
  const { profile } = useProfile()
  const isAdmin = profile?.role === 'admin'

  const [blocks, setBlocks] = useState(initialBlocks)
  const [revealed, setRevealed] = useState<ChapterBlock[]>([])
  const [solved, setSolved] = useState<Set<string> | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = useMemo(() => {
    const known = new Set(blocks.map((b) => b.id))
    return stepsOf([...blocks, ...revealed.filter((b) => !known.has(b.id))])
  }, [blocks, revealed])

  // Úvodný stav: kde hráčka skončila (prvý nesplnený krok).
  useEffect(() => {
    let active = true
    const ids = stepsOf(initialBlocks).map((s) => s.id)
    Promise.all([fetchSolvedBlocks(ids), fetchStepCount(chapterId)])
      .then(([done, count]) => {
        if (!active) return
        setSolved(done)
        setTotal(count)
        const firstOpen = ids.findIndex((id) => !done.has(id))
        setViewing(
          firstOpen >= 0
            ? firstOpen
            : status === 'completed' && ids.length > 0
              ? 0
              : ids.length,
        )
      })
      .catch(() => {
        if (!active) return
        setSolved(new Set())
        setTotal(null)
        setViewing(0)
      })
    return () => {
      active = false
    }
    // Iba pri otvorení kapitoly — ďalej stav drží komponent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId])

  useEffect(() => {
    if (viewing !== null) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [viewing])

  const reveal = useCallback<Reveal>(
    (more) => setRevealed((prev) => [...prev, ...more]),
    [],
  )

  // Krok splnený — server teraz vydá ďalší, tak ho načítame.
  const markSolved = useCallback(
    async (id: string) => {
      setSolved((prev) => new Set(prev).add(id))
      try {
        setBlocks(await fetchChapterBlocks(chapterId))
      } catch {
        setError('Ďalší krok sa nepodarilo načítať — skús obnoviť stránku.')
      }
    },
    [chapterId],
  )

  if (solved === null || viewing === null) {
    return <p className="text-sm text-[var(--color-muted)]">Načítavam…</p>
  }

  const stepCount = Math.max(total ?? 0, steps.length)
  const atEnd = viewing >= steps.length
  const step: BlockNode | undefined = steps[viewing]
  const isSolved = step ? solved.has(step.id) : true
  // Príbeh a fotka majú vlastné pokračovanie (Ďalej / poloha), otázka a QR nie.
  const gateable = step?.block_type === 'text' || step?.block_type === 'photo'
  const locationGate = gateable && step.gate === 'location'
  const needsLocation = locationGate && !isSolved

  async function next() {
    if (!step) return
    setError(null)
    if (isSolved || isAdmin) {
      setViewing(viewing! + 1)
      return
    }
    setAdvancing(true)
    try {
      await completeBlockStep(step.id)
      await markSolved(step.id)
      setViewing(viewing! + 1)
    } catch (err) {
      setError(`Nepodarilo sa pokračovať: ${getErrorMessage(err)}`)
    } finally {
      setAdvancing(false)
    }
  }

  const waitingFor =
    step && !isSolved && !isAdmin
      ? step.block_type === 'question'
        ? 'Najprv správne odpovedz na otázku.'
        : step.block_type === 'qr'
          ? 'Najprv nájdi a naskenuj QR kód.'
          : null
      : null

  return (
    <div className="flex flex-col gap-4">
      {stepCount > 1 && (
        <StepProgress current={viewing} total={stepCount} solved={solved} steps={steps} />
      )}

      <div key={viewing} className="animate-fade-in-up flex flex-col gap-4">
        {step ? (
          <BlockNodeView
            node={step}
            depth={0}
            index={0}
            onReveal={reveal}
            onSolved={() => void markSolved(step.id)}
          />
        ) : steps.length < stepCount ? (
          <p className="text-sm text-[var(--color-muted)]">Načítavam ďalší krok…</p>
        ) : status === 'completed' ? (
          <p className="rounded-2xl bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted)] shadow-sm">
            ✓ Táto kapitola je splnená.
          </p>
        ) : (
          <ChapterActionPanel chapter={chapter} onCompleted={onChapterCompleted} />
        )}

        {step && needsLocation && (
          <BlockLocationGate
            blockId={step.id}
            onPassed={() => void markSolved(step.id)}
          />
        )}
        {locationGate && isSolved && (
          <p className="animate-unlock text-center font-medium text-[var(--color-accent)]">
            📍 Si na mieste!
          </p>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {waitingFor && (
        <p className="text-center text-sm text-[var(--color-muted)]">{waitingFor}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setViewing(viewing - 1)}
          disabled={viewing === 0}
          className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-accent)] disabled:invisible"
        >
          ← Späť
        </button>
        {!atEnd && (!needsLocation || isAdmin) && (
          <button
            type="button"
            onClick={() => void next()}
            disabled={advancing || (!isSolved && !isAdmin && !gateable)}
            className="ml-auto rounded-lg bg-[var(--color-accent)] px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {advancing
              ? 'Moment…'
              : viewing === steps.length - 1 && steps.length >= stepCount
                ? 'Na koniec kapitoly →'
                : 'Ďalej →'}
          </button>
        )}
      </div>
    </div>
  )
}

function StepProgress({
  current,
  total,
  solved,
  steps,
}: {
  current: number
  total: number
  solved: Set<string>
  steps: BlockNode[]
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => {
          const done = steps[i] ? solved.has(steps[i].id) : false
          return (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === current
                  ? 'w-5 bg-[var(--color-accent)]'
                  : done
                    ? 'w-2 bg-[var(--color-accent)]/60'
                    : 'w-2 bg-[var(--color-accent)]/15'
              }`}
            />
          )
        })}
      </div>
      <span className="shrink-0 text-xs text-[var(--color-muted)]">
        {current < total ? `Krok ${current + 1} z ${total}` : 'Koniec kapitoly'}
      </span>
    </div>
  )
}
