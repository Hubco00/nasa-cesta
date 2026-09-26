import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { ContentManager } from '../../features/admin/content/ContentManager'
import { PlaceField } from '../../features/admin/content/PlaceField'
import { ConditionsEditor } from '../../features/admin/ConditionsEditor'
import { MapPinsEditor } from '../../features/admin/MapPinsEditor'
import { QrTokenEditor } from '../../features/admin/QrTokenEditor'
import {
  adminCreateChapter,
  adminGetChapterAnswer,
  adminDeleteChapter,
  adminGetChapter,
  adminListChapters,
  adminListQuestions,
  adminSetChapterAnswer,
  adminUpdateChapter,
  type ChapterRow,
  type QuestionOption,
} from '../../features/admin/api'
import { slugify } from '../../lib/validation'
import { getErrorMessage } from '../../lib/errors'

function toErrorMessage(err: unknown): string {
  const message = getErrorMessage(err)
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
  const [requiredBlockId, setRequiredBlockId] = useState('')
  const [hiddenUntilUnlocked, setHiddenUntilUnlocked] = useState(false)
  const [questions, setQuestions] = useState<QuestionOption[]>([])
  const [deleting, setDeleting] = useState(false)
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
  const [settingsOpen, setSettingsOpen] = useState(isNew)

  useEffect(() => {
    void adminListChapters().then(setAllChapters)
    void adminListQuestions().then(setQuestions)
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
      setRequiredBlockId(row.required_block_id ?? '')
      setHiddenUntilUnlocked(row.hidden_until_unlocked)
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
      if (row.unlock_type === 'question') {
        void adminGetChapterAnswer(row.id).then((answers) => {
          if (answers) setAnswer(answers.join(', '))
        })
      }
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
        required_block_id: requiredBlockId || null,
        hidden_until_unlocked: hiddenUntilUnlocked,
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

  async function deleteChapter() {
    if (!id || !chapter) return
    const ok = confirm(
      `Zmazať kapitolu „${chapter.title}“ aj s celým obsahom (príbehy, fotky, otázky, ` +
        'miesta na mape) a postupom hráčky v nej? Nedá sa to vrátiť.',
    )
    if (!ok) return
    setDeleting(true)
    setError(null)
    try {
      await adminDeleteChapter(id)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(toErrorMessage(err))
      setDeleting(false)
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

  const back = { to: '/admin', label: 'Admin panel' }

  if (loading) {
    return (
      <Layout back={back}>
        <p className="text-sm text-[var(--color-muted)]">Načítavam…</p>
      </Layout>
    )
  }

  const publishToggle = !isNew && chapter && (
    <button
      onClick={() => void togglePublished()}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
        chapter.is_published
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-rose-100 text-rose-800'
      }`}
    >
      {chapter.is_published ? 'Publikované' : 'Nepublikované'}
    </button>
  )

  return (
    <Layout back={back} actions={publishToggle}>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-xl">
        {isNew ? 'Nová kapitola' : chapter?.title}
      </h1>
      {isNew && (
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Najprv kapitolu pomenuj a vytvor — potom do nej pridáš príbehy, fotky a otázky.
        </p>
      )}

      {!isNew && id && (
        <>
          <section className="mt-5">
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-base">
              Obsah kapitoly
            </h2>
            <p className="mb-3 text-sm text-[var(--color-muted)]">
              Hráčka prechádza obsah po krokoch v tomto poradí — ďalší krok uvidí, až keď
              dokončí predchádzajúci (tlačidlo „Ďalej“, príchod na miesto, správna odpoveď
              alebo naskenovaný QR kód).
            </p>
            <ContentManager chapterId={id} />
          </section>

          <section className="mt-8">
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-base">
              Mapa — miesta v tejto kapitole
            </h2>
            <MapPinsEditor chapterId={id} />
          </section>

          <button
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            className="mb-3 mt-8 flex w-full items-center justify-between rounded-xl border border-[var(--paper-border)] px-4 py-3 text-left"
          >
            <span className="font-[family-name:var(--font-display)] text-base">
              Nastavenia kapitoly
            </span>
            <span className="text-sm text-[var(--color-muted)]">
              {settingsOpen ? '▲ skryť' : '▼ názov, odomknutie, správy'}
            </span>
          </button>
        </>
      )}

      {settingsOpen && (
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-4 shadow-sm">
          <label className="flex flex-col gap-1 text-sm">
            Názov
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (isNew) setSlug(slugify(e.target.value))
              }}
              className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Slug (URL)
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Krátky popis
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Typ odomknutia
            <select
              value={unlockType}
              onChange={(e) =>
                setUnlockType(e.target.value as (typeof UNLOCK_TYPES)[number])
              }
              className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
            >
              {UNLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--paper-border)] p-3">
            <legend className="px-1 text-sm font-medium">Kedy sa kapitola odomkne</legend>
            <p className="text-xs text-[var(--color-muted)]">
              Odomkne sa, keď sú splnené všetky nastavené podmienky. Bez podmienky je
              dostupná hneď.
            </p>

            <label className="flex flex-col gap-1 text-sm">
              Po dokončení kapitoly
              <select
                value={requiredChapterId}
                onChange={(e) => setRequiredChapterId(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
              >
                <option value="">— žiadna —</option>
                {allChapters
                  .filter((c) => c.id !== id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Po správnej odpovedi na otázku
              <select
                value={requiredBlockId}
                onChange={(e) => setRequiredBlockId(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
              >
                <option value="">— žiadna —</option>
                {questions
                  .filter((q) => q.chapterId !== id)
                  .map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
              </select>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={hiddenUntilUnlocked}
                onChange={(e) => setHiddenUntilUnlocked(e.target.checked)}
                className="mt-1"
              />
              <span>
                Skryť na mape, kým sa neodomkne
                <span className="block text-xs text-[var(--color-muted)]">
                  Inak ju hráčka vidí ako zamknutú (zámok s číslom).
                </span>
              </span>
            </label>
          </fieldset>

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
                  className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Správna odpoveď (viac variantov oddeľ čiarkou)
                <input
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value)
                    setAnswerSaved(false)
                  }}
                  placeholder="napr. Bratislava, bratislava"
                  className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
                />
              </label>
            </>
          )}

          {unlockType === 'location' && (
            <div className="flex flex-col gap-2 rounded-xl border border-rose-200 p-3">
              <PlaceField
                label="Kde sa kapitola dokončí"
                value={
                  latitude && longitude
                    ? {
                        lat: Number(latitude),
                        lng: Number(longitude),
                        radiusMeters: Number(radius) || 150,
                      }
                    : null
                }
                onChange={(place) => {
                  setLatitude(String(place.lat))
                  setLongitude(String(place.lng))
                  setRadius(String(place.radiusMeters))
                }}
                radiusOptions={[50, 100, 150, 300, 500, 1000, 2000]}
                defaultRadius={150}
                help="Na konci kapitoly uvidí tlačidlo „Skontrolovať polohu“."
              />
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
              className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Správa pri úspechu
            <input
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Správa pri neúspechu
            <input
              value={failureMessage}
              onChange={(e) => setFailureMessage(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-rose-200 bg-transparent px-3 py-2"
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

          {!isNew && (
            <div className="mt-3 border-t border-[var(--paper-border)] pt-3">
              <button
                onClick={() => void deleteChapter()}
                disabled={deleting}
                className="text-sm font-medium text-rose-600 disabled:opacity-60"
              >
                {deleting ? 'Mažem…' : 'Zmazať kapitolu'}
              </button>
            </div>
          )}
        </div>
      )}

      {settingsOpen && !isNew && id && unlockType === 'qr_code' && (
        <section className="mt-6">
          <h2 className="mb-2 font-medium">QR kód</h2>
          <QrTokenEditor chapterId={id} conditionId={null} />
        </section>
      )}

      {settingsOpen && !isNew && id && unlockType === 'combined' && (
        <section className="mt-6">
          <h2 className="mb-2 font-medium">Kombinované podmienky</h2>
          <ConditionsEditor chapterId={id} />
        </section>
      )}
    </Layout>
  )
}
