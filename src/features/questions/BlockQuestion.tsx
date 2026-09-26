import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { renderMarkdownSafe } from '../../lib/security'
import { LetterPhotos } from '../chapters/PhotoFigure'
import {
  fetchBlockSolved,
  fetchQuestionOutcome,
  verifyBlockAnswer,
  verifyBlockPlace,
  type BlockAnswerResult,
  type QuestionResult,
} from '../chapters/api'
import type { BlockQuestionConfig, ChapterBlock } from '../chapters/types'
import { formatDistance, type LatLng } from '../places/types'

// Leaflet sa načíta až keď hráčka otvorí mapu.
const PlacePickerOverlay = lazy(() => import('../places/PlacePickerOverlay'))

type State = 'loading' | 'open' | 'wrong' | 'solved'

export function BlockQuestion({
  block,
  onSolved,
}: {
  block: ChapterBlock
  /** Správna odpoveď — v krokoch kapitoly tým hráčka môže pokračovať. */
  onSolved?: () => void
}) {
  const config = (block.question_config ?? {}) as BlockQuestionConfig
  const options = config.type === 'choice' ? (config.options ?? []) : []
  const isPlace = config.type === 'place'
  const [state, setState] = useState<State>('loading')
  const [outcome, setOutcome] = useState<ChapterBlock | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(false)
  const [unlocked, setUnlocked] = useState<{ title: string; slug: string }[]>([])
  const [mapOpen, setMapOpen] = useState(false)
  const [picked, setPicked] = useState<LatLng | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  async function showOutcome(result: QuestionResult) {
    setOutcome(await fetchQuestionOutcome(block.id, result).catch(() => null))
  }

  useEffect(() => {
    let active = true
    fetchBlockSolved(block.id)
      .then(async (solved) => {
        if (!active) return
        if (solved) {
          const letter = await fetchQuestionOutcome(block.id, 'correct').catch(() => null)
          if (active) setOutcome(letter)
        }
        if (active) setState(solved ? 'solved' : 'open')
      })
      .catch(() => {
        if (active) setState('open')
      })
    return () => {
      active = false
    }
  }, [block.id])

  async function submit(verify: () => Promise<BlockAnswerResult>): Promise<boolean> {
    setSubmitting(true)
    setError(false)
    try {
      const { correct, unlockedChapters } = await verify()
      await showOutcome(correct ? 'correct' : 'wrong')
      setUnlocked(unlockedChapters)
      setState(correct ? 'solved' : 'wrong')
      if (correct) onSolved?.()
      return true
    } catch {
      setError(true)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!answer.trim()) return
    void submit(() => verifyBlockAnswer(block.id, answer))
  }

  async function submitPlace(place: LatLng) {
    setPicked(place)
    const answered = await submit(async () => {
      const result = await verifyBlockPlace(block.id, place.lat, place.lng)
      setDistance(result.distanceMeters)
      return result
    })
    if (answered) setMapOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="paper rounded-lg p-5">
        <p className="mb-3 font-[family-name:var(--font-display)] text-xs tracking-wider opacity-70">
          Otázka
        </p>
        <p className="text-lg leading-snug">{block.body_markdown}</p>

        {state === 'solved' && !outcome && (
          <p className="animate-unlock mt-4 font-medium text-[var(--color-accent)]">
            ✓ Správne!
          </p>
        )}

        {state !== 'solved' && isPlace && (
          <div className="mt-4 flex flex-col gap-3">
            {state === 'wrong' && (
              <p className="text-sm text-rose-700">
                {distance !== null
                  ? `Vedľa — tvoje miesto je asi ${formatDistance(distance)} od správneho.`
                  : 'To nie je ono, skús to znova.'}
              </p>
            )}
            {state === 'wrong' && config.hint && (
              <p className="text-sm italic opacity-80">Nápoveda: {config.hint}</p>
            )}
            {error && (
              <p className="text-sm text-rose-700">
                Odpoveď sa nepodarilo overiť, skús znova.
              </p>
            )}
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              disabled={state === 'loading'}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <span aria-hidden="true">📍</span>
              {state === 'wrong' ? 'Skúsiť znova na mape' : 'Ukázať na mape'}
            </button>
          </div>
        )}

        {mapOpen && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-muted)]">
                Načítavam mapu…
              </div>
            }
          >
            <PlacePickerOverlay
              title={block.body_markdown ?? 'Otázka'}
              backLabel="Otázka"
              initial={picked}
              onClose={() => setMapOpen(false)}
              footer={(place) => (
                <div className="flex flex-col gap-2">
                  {error && (
                    <p className="text-center text-sm text-rose-700">
                      Odpoveď sa nepodarilo overiť — skontroluj pripojenie a skús znova.
                    </p>
                  )}
                  {place ? (
                    <button
                      type="button"
                      onClick={() => void submitPlace(place)}
                      disabled={submitting}
                      className="rounded-lg bg-[var(--color-accent)] px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting ? 'Overujem…' : 'Toto je to miesto'}
                    </button>
                  ) : (
                    <p className="py-2 text-center text-sm text-[var(--color-muted)]">
                      Nájdi miesto a ťukni naň na mape.
                    </p>
                  )}
                </div>
              )}
            />
          </Suspense>
        )}

        {state !== 'solved' && !isPlace && (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            {options.length > 0 ? (
              <div className="flex flex-col gap-2">
                {options.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                      answer === option
                        ? 'border-[var(--color-accent)] bg-white/40'
                        : 'border-[var(--paper-border)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${block.id}`}
                      value={option}
                      checked={answer === option}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="accent-[var(--color-accent)]"
                    />
                    {option}
                  </label>
                ))}
              </div>
            ) : (
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Tvoja odpoveď…"
                className="rounded-lg border border-[var(--paper-border)] bg-white/40 px-3 py-2.5 outline-none focus:border-[var(--color-accent)]"
              />
            )}

            {state === 'wrong' && !outcome && (
              <p className="text-sm text-rose-700">To nie je ono, skús to znova.</p>
            )}
            {state === 'wrong' && config.hint && (
              <p className="text-sm italic opacity-80">Nápoveda: {config.hint}</p>
            )}
            {error && (
              <p className="text-sm text-rose-700">
                Odpoveď sa nepodarilo overiť, skús znova.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || state === 'loading' || !answer.trim()}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting
                ? 'Overujem…'
                : state === 'wrong'
                  ? 'Skúsiť znova'
                  : 'Odpovedať'}
            </button>
          </form>
        )}
      </div>

      {outcome && (state === 'solved' || state === 'wrong') && (
        <OutcomeLetter key={outcome.id} letter={outcome} correct={state === 'solved'} />
      )}

      {unlocked.map((chapter) => (
        <Link
          key={chapter.slug}
          to={`/chapters/${chapter.slug}`}
          className="animate-unlock flex items-center gap-3 rounded-lg border border-[var(--color-gold-500)] bg-[var(--color-gold-400)]/20 px-4 py-3"
        >
          <span aria-hidden="true" className="text-xl">
            ✦
          </span>
          <span className="flex-1">
            <span className="block text-xs uppercase tracking-wider opacity-70">
              Odomkla sa nová kapitola
            </span>
            <span className="font-[family-name:var(--font-display)]">
              {chapter.title}
            </span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  )
}

function OutcomeLetter({ letter, correct }: { letter: ChapterBlock; correct: boolean }) {
  return (
    <div className="animate-unlock paper rounded-lg p-5">
      <p
        className={`mb-2 font-[family-name:var(--font-display)] text-xs tracking-wider ${
          correct ? 'text-[var(--color-accent)]' : 'opacity-70'
        }`}
      >
        {correct ? '✓ Správne' : 'Nie celkom…'}
      </p>
      {letter.body_markdown?.trim() && (
        <div
          className="prose-romantic"
          dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(letter.body_markdown) }}
        />
      )}
      {letter.storage_path && (
        <LetterPhotos
          photos={[{ storagePath: letter.storage_path, caption: letter.caption }]}
        />
      )}
    </div>
  )
}
