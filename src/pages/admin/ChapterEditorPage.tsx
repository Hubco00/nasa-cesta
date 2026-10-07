import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { ContentManager } from '../../features/admin/content/ContentManager'
import { MapPinsEditor } from '../../features/admin/MapPinsEditor'
import {
  adminCreateChapter,
  adminDeleteChapter,
  adminGetChapter,
  adminListChapters,
  adminListQuestions,
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

// Starší spôsob dokončenia celej kapitoly. Otázky, QR kódy a polohu teraz admin
// pridáva ako kroky v obsahu; kapitola sa dokončí tlačidlom na konci (manual).
const LEGACY_COMPLETION: Record<string, string> = {
  qr_code: 'naskenovaním QR kódu',
  location: 'príchodom na miesto',
  question: 'odpoveďou na otázku',
  combined: 'kombináciou podmienok',
  admin: 'až keď ju odomkneš ty',
}

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
  const [requiredChapterId, setRequiredChapterId] = useState('')
  const [requiredBlockId, setRequiredBlockId] = useState('')
  const [hiddenUntilUnlocked, setHiddenUntilUnlocked] = useState(false)
  const [isTutorial, setIsTutorial] = useState(false)
  const [questions, setQuestions] = useState<QuestionOption[]>([])
  const [deleting, setDeleting] = useState(false)
  const [isFinal, setIsFinal] = useState(false)
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
      setRequiredChapterId(row.required_chapter_id ?? '')
      setRequiredBlockId(row.required_block_id ?? '')
      setHiddenUntilUnlocked(row.hidden_until_unlocked)
      setIsTutorial(row.is_tutorial)
      setIsFinal(row.is_final)
      setLoading(false)
    })
  }, [id, isNew])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const patch = {
        title,
        slug,
        description: description || null,
        // Tutoriál je na začiatku a na nič nečaká (inak by sa hra zasekla).
        is_tutorial: isTutorial,
        required_chapter_id: isTutorial ? null : requiredChapterId || null,
        required_block_id: isTutorial ? null : requiredBlockId || null,
        hidden_until_unlocked: isTutorial ? false : hiddenUntilUnlocked,
        is_final: isTutorial ? false : isFinal,
      }

      // Tutoriál ide v poradí vždy pred ostatné kapitoly.
      const others = allChapters.filter((c) => c.id !== id)
      const minOther = Math.min(...others.map((c) => c.order_index))
      const firstOrder = Number.isFinite(minOther) ? minOther - 10 : 10

      if (isNew) {
        const maxOrder = allChapters.reduce((m, c) => Math.max(m, c.order_index), 0)
        const created = await adminCreateChapter({
          ...patch,
          unlock_type: 'manual',
          order_index: isTutorial ? firstOrder : maxOrder + 10,
        })
        navigate(`/admin/chapters/${created.id}`, { replace: true })
      } else if (id) {
        const moveFirst = isTutorial && chapter && chapter.order_index >= minOther
        const updated = await adminUpdateChapter(id, {
          ...patch,
          ...(moveFirst ? { order_index: firstOrder } : {}),
        })
        setChapter(updated)
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

  async function switchToManualCompletion() {
    if (!id) return
    setError(null)
    try {
      setChapter(
        await adminUpdateChapter(id, {
          unlock_type: 'manual',
          question_config: null,
          latitude: null,
          longitude: null,
          allowed_radius_meters: null,
        }),
      )
    } catch (err) {
      setError(toErrorMessage(err))
    }
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
          Najprv kapitolu pomenuj a vytvor — potom do nej pridáš príbehy, fotky, otázky a
          QR kódy.
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
              {settingsOpen ? '▲ skryť' : '▼ názov, popis, odomknutie'}
            </span>
          </button>
        </>
      )}

      {settingsOpen && (
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-1.5 text-sm">
            Typ kapitoly
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [false, 'Bežná kapitola'],
                  [true, 'Tutoriál'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setIsTutorial(value)}
                  className={`rounded-lg border px-3 py-2 ${
                    isTutorial === value
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : 'border-rose-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {isTutorial && (
              <p className="text-xs text-[var(--color-muted)]">
                Hráčka uvidí najprv iba túto kapitolu. Ostatné kapitoly sa jej objavia, až
                keď tutoriál dokončí. Na mape je vždy prvý.
              </p>
            )}
          </div>

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

          {!isTutorial && (
            <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--paper-border)] p-3">
              <legend className="px-1 text-sm font-medium">
                Kedy sa kapitola odomkne
              </legend>
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
          )}

          {!isTutorial && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => setIsFinal(e.target.checked)}
              />
              Finálna kapitola
            </label>
          )}

          {chapter && LEGACY_COMPLETION[chapter.unlock_type] && (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p>
                Táto kapitola sa dokončuje po starom —{' '}
                {LEGACY_COMPLETION[chapter.unlock_type]}. Otázky, QR kódy a polohu teraz
                pridávaš ako kroky v obsahu kapitoly.
              </p>
              <button
                type="button"
                onClick={() => void switchToManualCompletion()}
                className="self-start rounded-lg border border-amber-500 px-3 py-1.5 font-medium"
              >
                Dokončovať tlačidlom na konci
              </button>
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            onClick={() => void handleSave()}
            disabled={saving || !title || !slug}
            className="self-start rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Ukladám…' : isNew ? 'Vytvoriť kapitolu' : 'Uložiť zmeny'}
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
    </Layout>
  )
}
