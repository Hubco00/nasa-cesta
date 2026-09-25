import { useEffect, useState } from 'react'
import {
  adminCreateCondition,
  adminDeleteCondition,
  adminListConditions,
  adminSetConditionAnswer,
  type UnlockConditionRow,
} from './api'
import { QrTokenEditor } from './QrTokenEditor'

const CONDITION_TYPE_LABELS = {
  question: 'otázka',
  qr_code: 'QR kód',
  location: 'GPS poloha',
} as const
const CONDITION_TYPES = Object.keys(
  CONDITION_TYPE_LABELS,
) as (keyof typeof CONDITION_TYPE_LABELS)[]

export function ConditionsEditor({ chapterId }: { chapterId: string }) {
  const [conditions, setConditions] = useState<UnlockConditionRow[]>([])
  const [newType, setNewType] = useState<(typeof CONDITION_TYPES)[number]>('question')

  async function reload() {
    setConditions(await adminListConditions(chapterId))
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload zámerne nie je v deps, inak by re-render vytváral novú referenciu a spôsobil nekonečnú slučku
  }, [chapterId])

  async function addCondition() {
    const stepOrder = conditions.length + 1
    await adminCreateCondition({
      chapter_id: chapterId,
      condition_type: newType,
      step_order: stepOrder,
    })
    await reload()
  }

  async function remove(id: string) {
    if (!confirm('Zmazať túto podmienku?')) return
    await adminDeleteCondition(id)
    await reload()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--color-muted)]">
        Podmienky sa musia splniť v poradí (1, 2, 3…). Napríklad najprv GPS poloha, potom
        otázka.
      </p>

      {conditions.map((condition, index) => (
        <div
          key={condition.id}
          className="flex flex-col gap-2 rounded-xl border border-rose-200 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {index + 1}. {condition.condition_type}
            </span>
            <button
              onClick={() => void remove(condition.id)}
              className="text-sm text-rose-600"
            >
              Zmazať
            </button>
          </div>

          {condition.condition_type === 'qr_code' && (
            <QrTokenEditor chapterId={chapterId} conditionId={condition.id} />
          )}
          {condition.condition_type === 'question' && (
            <QuestionAnswerField conditionId={condition.id} />
          )}
          {condition.condition_type === 'location' && (
            <p className="text-sm text-[var(--color-muted)]">
              GPS súradnice pre túto podmienku zatiaľ nastav priamo v Supabase Studio
              (chapter_unlock_conditions) — jednoduchý formulár pribudne neskôr.
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as (typeof CONDITION_TYPES)[number])}
          className="rounded-lg border border-rose-200 bg-transparent px-2 py-1.5 text-sm"
        >
          {CONDITION_TYPES.map((t) => (
            <option key={t} value={t}>
              {CONDITION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          onClick={() => void addCondition()}
          className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white"
        >
          + Pridať podmienku
        </button>
      </div>
    </div>
  )
}

function QuestionAnswerField({ conditionId }: { conditionId: string }) {
  const [answer, setAnswer] = useState('')
  const [saved, setSaved] = useState(false)

  async function save() {
    if (!answer.trim()) return
    await adminSetConditionAnswer(
      conditionId,
      answer
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    )
    setSaved(true)
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value)
          setSaved(false)
        }}
        placeholder="Správna odpoveď (viac variantov odděľ čiarkou)"
        className="flex-1 rounded-lg border border-rose-200 bg-transparent px-3 py-1.5 text-sm"
      />
      <button
        onClick={() => void save()}
        className="rounded-lg border border-[var(--color-accent)] px-3 py-1.5 text-sm text-[var(--color-accent)]"
      >
        {saved ? 'Uložené ✓' : 'Uložiť'}
      </button>
    </div>
  )
}
