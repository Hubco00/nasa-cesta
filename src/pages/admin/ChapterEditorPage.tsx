import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { BlockEditor } from '../../features/admin/BlockEditor'
import { ConditionsEditor } from '../../features/admin/ConditionsEditor'
import { QrTokenEditor } from '../../features/admin/QrTokenEditor'
import {
  adminCreateChapter,
  adminGetChapter,
  adminListChapters,
  adminSetChapterAnswer,
  adminUpdateChapter,
  type ChapterRow,
} from '../../features/admin/api'
import { slugify } from '../../lib/validation'

function toErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('chapters_slug_key')) {
    return 'Kapitola s týmto slugom už existuje — zvoľ iný slug.'
  }
  return `Uloženie zlyhalo: ${message}`
}

const UNLOCK_TYPES = [
  'manual',
  'qr_code',
  'location',
  'question',
  'combined',
  'admin',
] as const

export function ChapterEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [chapter, setChapter] = useState<ChapterRow | null>(null)
  const [allChapters, setAllChapters] = useState<ChapterRow[]>([])
  const [loading, setLoading] = useState(!isNew)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [unlockType, setUnlockType] = useState<(typeof UNLOCK_TYPES)[number]>('manual')
  const [requiredChapterId, setRequiredChapterId] = useState('')
  const [isFinal, setIsFinal] = useState(false)
  const [hint, setHint] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [failureMessage, setFailureMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [answerSaved, setAnswerSaved] = useState(false)
  const [maxAttempts, setMaxAttempts] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('150')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void adminListChapters().then(setAllChapters)
  }, [])

  useEffect(() => {
    if (isNew || !id) return
    void adminGetChapter(id).then((row) => {
      if (!row) return
      setChapter(row)
      setTitle(row.title)
      setSlug(row.slug)
      setDescription(row.description ?? '')
      setUnlockType(row.unlock_type as (typeof UNLOCK_TYPES)[number])
      setRequiredChapterId(row.required_chapter_id ?? '')
      setIsFinal(row.is_final)
      setHint(row.hint ?? '')
      setSuccessMessage(row.success_message ?? '')
      setFailureMessage(row.failure_message ?? '')
      setLatitude(row.latitude?.toString() ?? '')
      setLongitude(row.longitude?.toString() ?? '')
      setRadius(row.allowed_radius_meters?.toString() ?? '150')
      const qc = row.question_config as {
        prompt?: string
        maxAttempts?: number | null
      } | null
      setMaxAttempts(qc?.maxAttempts?.toString() ?? '')
      setLoading(false)
    })
  }, [id, isNew])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const questionConfig =
        unlockType === 'question'
          ? {
              type: 'single',
              maxAttempts: maxAttempts ? Number(maxAttempts) : null,
              showHintOnWrongAnswer: true,
            }
          : null

      const patch = {
        title,
        slug,
        description: description || null,
        unlock_type: unlockType,
        required_chapter_id: requiredChapterId || null,
        is_final: isFinal,
        hint: hint || null,
        success_message: successMessage || null,
        failure_message: failureMessage || null,
        question_config: questionConfig,
        latitude: unlockType === 'location' ? Number(latitude) || null : null,
        longitude: unlockType === 'location' ? Number(longitude) || null : null,
        allowed_radius_meters: unlockType === 'location' ? Number(radius) || null : null,
      }

      if (isNew) {
        const maxOrder = allChapters.reduce((m, c) => Math.max(m, c.order_index), 0)
        const created = await adminCreateChapter({ ...patch, order_index: maxOrder + 10 })
        navigate(`/admin/chapters/${created.id}`, { replace: true })
      } else if (id) {
        const updated = await adminUpdateChapter(id, patch)
        setChapter(updated)
      }

      if (unlockType === 'question' && answer.trim() && id) {
        await adminSetChapterAnswer(
          id,
          answer
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
        )
        setAnswerSaved(true)
      }
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function togglePublished() {
    if (!id || !chapter) return
    const updated = await adminUpdateChapter(id, { is_published: !chapter.is_published })
    setChapter(updated)
  }

  function useCurrentLocation() {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLatitude(pos.coords.latitude.toString())
      setLongitude(pos.coords.longitude.toString())
    })
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-sm text-[var(--color-muted)]">Načítavam…</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/admin" className="text-sm text-[var(--color-accent)] underline">
          ← Späť na kapitoly
        </Link>
        {!isNew && chapter && (
          <button
            onClick={() => void togglePublished()}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              chapter.is_published
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {chapter.is_published ? 'Publikované' : 'Skryté'}
          </button>
        )}
      </div>

      <h1 className="mb-4 font-[family-name:var(--font-display)] text-xl">
        {isNew ? 'Nová kapitola' : 'Upraviť kapitolu'}
      </h1>

      <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-sm">
          Názov
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (isNew) setSlug(slugify(e.target.value))
            }}
            className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Slug (URL)
          <input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Krátky popis
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Typ odomknutia
          <select
            value={unlockType}
            onChange={(e) =>
              setUnlockType(e.target.value as (typeof UNLOCK_TYPES)[number])
            }
            className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
          >
            {UNLOCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Predchádzajúca kapitola (podmienka postupu)
          <select
            value={requiredChapterId}
            onChange={(e) => setRequiredChapterId(e.target.value)}
            className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
          >
            <option value="">— žiadna (prvá kapitola) —</option>
            {allChapters
              .filter((c) => c.id !== id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFinal}
            onChange={(e) => setIsFinal(e.target.checked)}
          />
          Finálna kapitola
        </label>

        {unlockType === 'question' && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Max. počet pokusov (prázdne = neobmedzené)
              <input
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                type="number"
                className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Správna odpoveď (nová hodnota prepíše starú; viac variantov oddeľ čiarkou)
              <input
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value)
                  setAnswerSaved(false)
                }}
                placeholder="napr. Bratislava, bratislava"
                className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
              />
            </label>
          </>
        )}

        {unlockType === 'location' && (
          <div className="flex flex-col gap-2 rounded-xl border border-rose-200 p-3">
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Latitude
                <input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Longitude
                <input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Povolený rádius (m)
              <input
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                type="number"
                className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
              />
            </label>
            <button
              onClick={useCurrentLocation}
              type="button"
              className="self-start text-sm text-[var(--color-accent)] underline"
            >
              Použiť moju aktuálnu polohu
            </button>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Nápoveda
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Správa pri úspechu
          <input
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
            className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Správa pri neúspechu
          <input
            value={failureMessage}
            onChange={(e) => setFailureMessage(e.target.value)}
            className="rounded-lg border border-rose-200 bg-transparent px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          onClick={() => void handleSave()}
          disabled={saving || !title || !slug}
          className="self-start rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Ukladám…' : isNew ? 'Vytvoriť kapitolu' : 'Uložiť zmeny'}
          {answerSaved && ' ✓'}
        </button>
      </div>

      {!isNew && id && (
        <>
          {unlockType === 'qr_code' && (
            <section className="mt-6">
              <h2 className="mb-2 font-medium">QR kód</h2>
              <QrTokenEditor chapterId={id} conditionId={null} />
            </section>
          )}

          {unlockType === 'combined' && (
            <section className="mt-6">
              <h2 className="mb-2 font-medium">Kombinované podmienky</h2>
              <ConditionsEditor chapterId={id} />
            </section>
          )}

          <section className="mt-6">
            <h2 className="mb-2 font-medium">Obsah kapitoly (príbeh, fotky)</h2>
            <BlockEditor chapterId={id} />
          </section>
        </>
      )}
    </Layout>
  )
}
