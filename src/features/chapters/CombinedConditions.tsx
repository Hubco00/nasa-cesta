import { lazy, Suspense, useEffect, useState } from 'react'
import { LocationCheck } from '../geolocation/LocationCheck'
import { QuestionForm } from '../questions/QuestionForm'
import { fetchConditionProgress, fetchUnlockConditions } from './api'
import type { QuestionConfig, UnlockCondition } from './types'

const QrChapterUnlock = lazy(() =>
  import('../qr-scanner/QrChapterUnlock').then((m) => ({ default: m.QrChapterUnlock })),
)

export function CombinedConditions({
  chapterId,
  onCompleted,
}: {
  chapterId: string
  onCompleted: () => void
}) {
  const [conditions, setConditions] = useState<UnlockCondition[]>([])
  const [progress, setProgress] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  async function reload() {
    const conds = await fetchUnlockConditions(chapterId)
    setConditions(conds)
    const prog = await fetchConditionProgress(conds.map((c) => c.id!).filter(Boolean))
    setProgress(prog)
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload zámerne nie je v deps, inak by re-render vytváral novú referenciu a spôsobil nekonečnú slučku
  }, [chapterId])

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">Načítavam podmienky…</p>
  }

  const current = conditions.find((c) => progress[c.id!] !== 'completed')

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-1 text-sm text-[var(--color-muted)]">
        {conditions.map((c, i) => (
          <li
            key={c.id}
            className={progress[c.id!] === 'completed' ? 'line-through' : ''}
          >
            {i + 1}. {conditionLabel(c.condition_type)}
            {progress[c.id!] === 'completed' ? ' ✓' : ''}
          </li>
        ))}
      </ol>

      {!current && (
        <p className="animate-unlock font-medium text-[var(--color-accent)]">
          Všetky podmienky splnené.
        </p>
      )}

      {current && (
        <ConditionStep
          condition={current}
          chapterId={chapterId}
          onCompleted={() => {
            void reload().then(() => {
              const stillPending = conditions.some(
                (c) => c.id !== current.id && progress[c.id!] !== 'completed',
              )
              if (!stillPending) onCompleted()
            })
          }}
        />
      )}
    </div>
  )
}

function conditionLabel(type: string | null): string {
  if (type === 'qr_code') return 'Naskenuj QR kód'
  if (type === 'location') return 'Prisúď sa na miesto'
  if (type === 'question') return 'Odpovedz na otázku'
  return 'Podmienka'
}

function ConditionStep({
  condition,
  chapterId,
  onCompleted,
}: {
  condition: UnlockCondition
  chapterId: string
  onCompleted: () => void
}) {
  if (condition.condition_type === 'qr_code') {
    return (
      <Suspense
        fallback={<p className="text-sm text-[var(--color-muted)]">Načítavam skener…</p>}
      >
        <QrChapterUnlock
          chapterId={chapterId}
          conditionId={condition.id}
          successMessage={condition.success_message}
          failureMessage={condition.failure_message}
          onCompleted={onCompleted}
        />
      </Suspense>
    )
  }
  if (condition.condition_type === 'location') {
    return (
      <LocationCheck
        chapterId={chapterId}
        conditionId={condition.id}
        successMessage={condition.success_message}
        failureMessage={condition.failure_message}
        onCompleted={onCompleted}
      />
    )
  }
  if (condition.condition_type === 'question') {
    return (
      <QuestionForm
        chapterId={chapterId}
        conditionId={condition.id}
        config={(condition.question_config as QuestionConfig) ?? {}}
        hint={condition.hint}
        successMessage={condition.success_message}
        failureMessage={condition.failure_message}
        onCompleted={onCompleted}
      />
    )
  }
  return null
}
