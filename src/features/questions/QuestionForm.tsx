import { useState, type FormEvent } from 'react'
import { verifyAnswer } from '../chapters/api'
import type { QuestionConfig } from '../chapters/types'

interface QuestionFormProps {
  chapterId: string
  conditionId: string | null
  config: QuestionConfig
  hint?: string | null
  successMessage?: string | null
  failureMessage?: string | null
  onCompleted: () => void
}

export function QuestionForm({
  chapterId,
  conditionId,
  config,
  hint,
  successMessage,
  failureMessage,
  onCompleted,
}: QuestionFormProps) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [exhausted, setExhausted] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!answer.trim()) return

    setSubmitting(true)
    try {
      const result = await verifyAnswer(chapterId, conditionId, answer)
      setSubmitting(false)
      setCorrect(result.correct)
      setShowHint(Boolean(result.showHint))
      setAttemptsLeft(result.attemptsLeft ?? null)
      setExhausted(Boolean(result.attemptsExhausted))
      if (result.correct) onCompleted()
    } catch {
      setSubmitting(false)
    }
  }

  if (correct) {
    return (
      <p className="animate-unlock rounded-2xl bg-[var(--color-surface)] p-5 font-medium text-[var(--color-accent)] shadow-sm">
        {successMessage ?? 'Správne!'}
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-5 shadow-sm"
    >
      {config.prompt && <p className="font-medium">{config.prompt}</p>}

      {config.options && config.options.length > 0 ? (
        <div className="flex flex-col gap-2">
          {config.options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="answer"
                value={option}
                checked={answer === option}
                onChange={(e) => setAnswer(e.target.value)}
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={exhausted}
          placeholder="Tvoja odpoveď…"
          className="rounded-lg border border-rose-200 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-accent)]"
        />
      )}

      {attemptsLeft !== null && !exhausted && (
        <p className="text-sm text-rose-600">
          {failureMessage ?? 'Skús to ešte raz.'} (zostáva pokusov: {attemptsLeft})
        </p>
      )}
      {exhausted && (
        <p className="text-sm text-rose-600">
          Minula si maximálny počet pokusov. Požiadaj o pomoc / ručné odomknutie.
        </p>
      )}
      {showHint && hint && (
        <p className="text-sm italic text-[var(--color-muted)]">Nápoveda: {hint}</p>
      )}

      {!exhausted && (
        <button
          type="submit"
          disabled={submitting || !answer.trim()}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? 'Overujem…' : 'Odpovedať'}
        </button>
      )}
    </form>
  )
}
