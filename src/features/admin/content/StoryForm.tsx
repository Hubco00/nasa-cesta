import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { removeChapterPhotos, uploadChapterPhoto } from '../../../lib/storage'
import {
  adminCreateBlock,
  adminDeleteBlock,
  adminUpdateBlock,
  type ChapterBlockRow,
} from '../api'
import { errorMessage, Field, FormActions, inputClass } from './ui'

interface ExistingPhoto {
  block: ChapterBlockRow
  caption: string
  remove: boolean
}

interface NewPhoto {
  file: File
  previewUrl: string
  caption: string
}

export function StoryForm({
  chapterId,
  mapPinId,
  story,
  photos,
  photoUrls,
  nextOrderIndex,
  onSaved,
  onCancel,
}: {
  chapterId: string
  mapPinId: string | null
  story?: ChapterBlockRow
  photos: ChapterBlockRow[]
  photoUrls: Record<string, string>
  nextOrderIndex: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(story?.title ?? '')
  const [body, setBody] = useState(story?.body_markdown ?? '')
  const [existing, setExisting] = useState<ExistingPhoto[]>(() =>
    photos.map((block) => ({ block, caption: block.caption ?? '', remove: false })),
  )
  const [added, setAdded] = useState<NewPhoto[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Náhľady nových fotiek uvoľniť až pri zatvorení formulára.
  const addedRef = useRef(added)
  useEffect(() => {
    addedRef.current = added
  }, [added])
  useEffect(
    () => () => addedRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)),
    [],
  )

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setAdded((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      })),
    ])
    event.target.value = ''
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim()) {
      setError('Napíš text príbehu.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let storyId = story?.id
      if (storyId) {
        await adminUpdateBlock(storyId, {
          title: title.trim() || null,
          body_markdown: body,
        })
      } else {
        const created = await adminCreateBlock({
          chapter_id: chapterId,
          map_pin_id: mapPinId,
          block_type: 'text',
          order_index: nextOrderIndex,
          title: title.trim() || null,
          body_markdown: body,
        })
        storyId = created.id
      }

      const removed = existing.filter((p) => p.remove)
      for (const p of removed) await adminDeleteBlock(p.block.id)
      await removeChapterPhotos(removed.map((p) => p.block.storage_path!).filter(Boolean))

      for (const p of existing) {
        if (!p.remove && p.caption !== (p.block.caption ?? '')) {
          await adminUpdateBlock(p.block.id, { caption: p.caption || null })
        }
      }

      const kept = existing.filter((p) => !p.remove).length
      for (const [i, p] of added.entries()) {
        const path = await uploadChapterPhoto(chapterId, p.file)
        await adminCreateBlock({
          chapter_id: chapterId,
          map_pin_id: mapPinId,
          parent_block_id: storyId,
          block_type: 'photo',
          order_index: (kept + i + 1) * 10,
          storage_path: path,
          caption: p.caption || null,
        })
      }

      onSaved()
    } catch (err) {
      setError(`Uloženie zlyhalo: ${errorMessage(err)}`)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Názov príbehu" hint="Voliteľné — zobrazí sa ako nadpis listu.">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="napr. Vlakom do Žiliny"
          className={inputClass}
        />
      </Field>

      <Field
        label="Príbeh"
        hint="**tučné**, *kurzíva*, > citát, prázdny riadok = nový odsek"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder="Napíš príbeh…"
          className={`${inputClass} leading-relaxed`}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Fotky k príbehu</span>

        {existing.map((p, i) => (
          <PhotoRow
            key={p.block.id}
            src={p.block.storage_path ? photoUrls[p.block.storage_path] : undefined}
            caption={p.caption}
            removed={p.remove}
            onCaption={(caption) =>
              setExisting((prev) => prev.map((x, j) => (j === i ? { ...x, caption } : x)))
            }
            onToggleRemove={() =>
              setExisting((prev) =>
                prev.map((x, j) => (j === i ? { ...x, remove: !x.remove } : x)),
              )
            }
          />
        ))}

        {added.map((p, i) => (
          <PhotoRow
            key={p.previewUrl}
            src={p.previewUrl}
            caption={p.caption}
            isNew
            onCaption={(caption) =>
              setAdded((prev) => prev.map((x, j) => (j === i ? { ...x, caption } : x)))
            }
            onToggleRemove={() => {
              URL.revokeObjectURL(p.previewUrl)
              setAdded((prev) => prev.filter((_, j) => j !== i))
            }}
          />
        ))}

        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--paper-border)] px-3 py-3 text-sm text-[var(--color-accent)] hover:bg-white/30">
          + Pridať fotku k príbehu
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={addFiles}
            className="sr-only"
          />
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  )
}

function PhotoRow({
  src,
  caption,
  removed = false,
  isNew = false,
  onCaption,
  onToggleRemove,
}: {
  src?: string
  caption: string
  removed?: boolean
  isNew?: boolean
  onCaption: (caption: string) => void
  onToggleRemove: () => void
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-[var(--paper-border)] p-2 ${removed ? 'opacity-40' : ''}`}
    >
      {src ? (
        <img src={src} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-14 w-14 shrink-0 rounded bg-black/10" />
      )}
      <input
        value={caption}
        onChange={(e) => onCaption(e.target.value)}
        disabled={removed}
        placeholder="Popis k fotke (voliteľné)"
        className={`${inputClass} text-sm`}
      />
      <button
        type="button"
        onClick={onToggleRemove}
        className="shrink-0 px-1 text-sm text-rose-600"
      >
        {removed ? 'Vrátiť' : isNew ? '✕' : 'Odstrániť'}
      </button>
    </div>
  )
}
