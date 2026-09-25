import { useEffect, useState, type FormEvent } from 'react'
import { fetchBlockSolved, verifyBlockAnswer } from '../chapters/api'
import type { BlockQuestionConfig, ChapterBlock } from '../chapters/types'

type State = 'loading' | 'open' | 'wrong' | 'solved'

export function BlockQuestion({ block }: { block: ChapterBlock }) {
  const config = (block.question_config ?? {}) as BlockQuestionConfig
  const options = config.type === 'choice' ? (config.options ?? []) : []
  const [state, setState] = useState<State>('loading')
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetchBlockSolved(block.id)
      .then((solved) => {
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
      setState((await verifyBlockAnswer(block.id, answer)) ? 'solved' : 'wrong')
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="paper rounded-lg p-5">
      <p className="mb-3 font-[family-name:var(--font-display)] text-xs tracking-wider opacity-70">
        Otázka
      </p>
      <p className="mb-4 text-lg leading-snug">{block.body_markdown}</p>

      {state === 'solved' ? (
        <p className="animate-unlock font-medium text-[var(--color-accent)]">
          ✓ {config.successMessage || 'Správne!'}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

          {state === 'wrong' && (
            <p className="text-sm text-rose-700">
              To nie je ono, skús to znova.
              {config.hint && (
                <span className="mt-1 block italic opacity-80">
                  Nápoveda: {config.hint}
                </span>
              )}
            </p>
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
            {submitting ? 'Overujem…' : 'Odpovedať'}
          </button>
        </form>
      )}
    </div>
  )
}
