import { useState } from 'react'
import { completeManualStep } from './api'

export function ManualStep({
  chapterId,
  successMessage,
  onCompleted,
}: {
  chapterId: string
  successMessage?: string | null
  onCompleted: () => void
}) {
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      await completeManualStep(chapterId)
      setDone(true)
      onCompleted()
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
    <button
      onClick={handleClick}
      disabled={submitting}
      className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {submitting ? 'Ukladám…' : 'Pokračovať'}
    </button>
  )
}
