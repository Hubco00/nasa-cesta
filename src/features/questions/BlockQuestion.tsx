import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { renderMarkdownSafe } from '../../lib/security'
import { LetterPhotos } from '../chapters/PhotoFigure'
import {
  fetchBlockSolved,
  fetchQuestionOutcome,
  verifyBlockAnswer,
  type QuestionResult,
} from '../chapters/api'
import type { BlockQuestionConfig, ChapterBlock } from '../chapters/types'

type State = 'loading' | 'open' | 'wrong' | 'solved'

export function BlockQuestion({ block }: { block: ChapterBlock }) {
  const config = (block.question_config ?? {}) as BlockQuestionConfig
  const options = config.type === 'choice' ? (config.options ?? []) : []
  const [state, setState] = useState<State>('loading')
  const [outcome, setOutcome] = useState<ChapterBlock | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(false)
  const [unlocked, setUnlocked] = useState<{ title: string; slug: string }[]>([])

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!answer.trim()) return
    setSubmitting(true)
    setError(false)
    try {
      const { correct, unlockedChapters } = await verifyBlockAnswer(block.id, answer)
      await showOutcome(correct ? 'correct' : 'wrong')
      setUnlocked(unlockedChapters)
      setState(correct ? 'solved' : 'wrong')
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
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

        {state !== 'solved' && (
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
