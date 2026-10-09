import { useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import { completeManualStep } from './api'

export function ManualStep({
  chapterId,
  successMessage,
  preview = false,
  onCompleted,
}: {
  chapterId: string
  successMessage?: string | null
  /** Admin v náhľade preskočil kroky — server by záver odmietol, nič sa neukladá. */
  preview?: boolean
  onCompleted: () => void
}) {
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setSubmitting(true)
    setError(null)
    try {
      if (!preview) await completeManualStep(chapterId)
      setDone(true)
      onCompleted()
    } catch (err) {
      setError(`Nepodarilo sa pokračovať: ${getErrorMessage(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <p className="animate-unlock rounded-2xl bg-[var(--color-surface)] p-5 font-medium text-[var(--color-accent)] shadow-sm">
        {successMessage ?? 'Kapitola splnená.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={submitting}
        className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? 'Ukladám…' : 'Pokračovať'}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  )
}
