import { useEffect, useState, type FormEvent } from 'react'
import type { BlockQuestionConfig } from '../../chapters/types'
import {
  adminCreateBlock,
  adminGetBlockAnswer,
  adminSetBlockAnswer,
  adminUpdateBlock,
  type ChapterBlockRow,
} from '../api'
import { errorMessage, Field, FormActions, inputClass } from './ui'

type AnswerMode = 'text' | 'choice'

export function QuestionEditorForm({
  chapterId,
  mapPinId,
  question,
  nextOrderIndex,
  onSaved,
  onCancel,
}: {
  chapterId: string
  mapPinId: string | null
  question?: ChapterBlockRow
  nextOrderIndex: number
  onSaved: () => void
  onCancel: () => void
}) {
  const config = (question?.question_config ?? {}) as BlockQuestionConfig
  const [prompt, setPrompt] = useState(question?.body_markdown ?? '')
  const [mode, setMode] = useState<AnswerMode>(
    config.type === 'choice' ? 'choice' : 'text',
  )
  const [textAnswers, setTextAnswers] = useState('')
  const [options, setOptions] = useState<string[]>(
    config.options && config.options.length > 0 ? config.options : ['', ''],
  )
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)
  const [hint, setHint] = useState(config.hint ?? '')
  const [successMessage, setSuccessMessage] = useState(config.successMessage ?? '')
  const [loadingAnswer, setLoadingAnswer] = useState(Boolean(question))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!question) return
    let active = true
    adminGetBlockAnswer(question.id)
      .then((answers) => {
        if (!active || !answers) return
        setTextAnswers(answers.join(', '))
        const idx = (config.options ?? []).findIndex((o) => answers.includes(o))
        setCorrectIndex(idx >= 0 ? idx : null)
      })
      .finally(() => {
        if (active) setLoadingAnswer(false)
      })
    return () => {
      active = false
    }
    // Načítať iba raz pri otvorení formulára.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!prompt.trim()) return setError('Napíš otázku.')

    let answers: string[]
    let cleanOptions: string[] = []
    if (mode === 'text') {
      answers = textAnswers
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
      if (answers.length === 0) return setError('Zadaj aspoň jednu správnu odpoveď.')
    } else {
      cleanOptions = options.map((o) => o.trim())
      if (cleanOptions.filter(Boolean).length < 2)
        return setError('Zadaj aspoň dve možnosti.')
      if (correctIndex === null || !cleanOptions[correctIndex]) {
        return setError('Označ, ktorá možnosť je správna.')
      }
      answers = [cleanOptions[correctIndex]]
      cleanOptions = cleanOptions.filter(Boolean)
    }

    const questionConfig: BlockQuestionConfig = {
      type: mode,
      ...(mode === 'choice' ? { options: cleanOptions } : {}),
      ...(hint.trim() ? { hint: hint.trim() } : {}),
      ...(successMessage.trim() ? { successMessage: successMessage.trim() } : {}),
    }

    setSaving(true)
    setError(null)
    try {
      let id = question?.id
      if (id) {
        await adminUpdateBlock(id, {
          body_markdown: prompt,
          question_config: { ...questionConfig },
        })
      } else {
        const created = await adminCreateBlock({
          chapter_id: chapterId,
          map_pin_id: mapPinId,
          block_type: 'question',
          order_index: nextOrderIndex,
          body_markdown: prompt,
          question_config: { ...questionConfig },
        })
        id = created.id
      }
      await adminSetBlockAnswer(id, answers)
      onSaved()
    } catch (err) {
      setError(`Uloženie zlyhalo: ${errorMessage(err)}`)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Otázka">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="napr. Čo sme si dali ako prvé na stanici?"
          className={inputClass}
        />
      </Field>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Ako odpovedá</span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['text', 'Napíše odpoveď'],
              ['choice', 'Vyberie z možností'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-lg border px-3 py-2 ${
                mode === value
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                  : 'border-[var(--paper-border)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'text' ? (
        <Field
          label="Správna odpoveď"
          hint="Viac možných odpovedí oddeľ čiarkou. Veľké/malé písmená a medzery sa ignorujú."
        >
          <input
            value={textAnswers}
            onChange={(e) => setTextAnswers(e.target.value)}
            disabled={loadingAnswer}
            placeholder={loadingAnswer ? 'Načítavam…' : 'napr. káva, kávu'}
            className={inputClass}
          />
        </Field>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Možnosti — označ správnu</span>
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-option"
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                aria-label={`Možnosť ${i + 1} je správna`}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <input
                value={option}
                onChange={(e) =>
                  setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                }
                placeholder={`Možnosť ${i + 1}`}
                className={inputClass}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setOptions((prev) => prev.filter((_, j) => j !== i))
                    setCorrectIndex((c) =>
                      c === i ? null : c !== null && c > i ? c - 1 : c,
                    )
                  }}
                  className="px-1 text-rose-600"
                  aria-label={`Odstrániť možnosť ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ''])}
            className="self-start text-[var(--color-accent)] hover:underline"
          >
            + Pridať možnosť
          </button>
        </div>
      )}

      <Field label="Nápoveda" hint="Voliteľné — zobrazí sa po nesprávnej odpovedi.">
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Správa po správnej odpovedi" hint="Voliteľné.">
        <input
          value={successMessage}
          onChange={(e) => setSuccessMessage(e.target.value)}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  )
}
