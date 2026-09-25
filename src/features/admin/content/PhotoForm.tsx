import { useEffect, useRef, useState, type FormEvent } from 'react'
import { removeChapterPhotos, uploadChapterPhoto } from '../../../lib/storage'
import { adminCreateBlock, adminUpdateBlock, type ChapterBlockRow } from '../api'
import { getErrorMessage } from '../../../lib/errors'
import { Field, FormActions, inputClass } from './ui'

export function PhotoForm({
  chapterId,
  mapPinId,
  photo,
  currentUrl,
  nextOrderIndex,
  onSaved,
  onCancel,
}: {
  chapterId: string
  mapPinId: string | null
  photo?: ChapterBlockRow
  currentUrl?: string
  nextOrderIndex: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState(photo?.caption ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewRef = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  function pickFile(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = next ? URL.createObjectURL(next) : null
    setFile(next)
    setPreviewUrl(previewRef.current)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!photo && !file) {
      setError('Vyber fotku.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (photo) {
        const patch: { caption: string | null; storage_path?: string } = {
          caption: caption || null,
        }
        if (file) patch.storage_path = await uploadChapterPhoto(chapterId, file)
        await adminUpdateBlock(photo.id, patch)
        if (file && photo.storage_path) await removeChapterPhotos([photo.storage_path])
      } else {
        const path = await uploadChapterPhoto(chapterId, file!)
        await adminCreateBlock({
          chapter_id: chapterId,
          map_pin_id: mapPinId,
          block_type: 'photo',
          order_index: nextOrderIndex,
          storage_path: path,
          caption: caption || null,
        })
      }
      onSaved()
    } catch (err) {
      setError(`Uloženie zlyhalo: ${getErrorMessage(err)}`)
      setSaving(false)
    }
  }

  const shown = previewUrl ?? currentUrl

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {shown && (
        <img src={shown} alt="" className="max-h-72 w-full rounded-lg object-contain" />
      )}

      <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--paper-border)] px-3 py-3 text-sm text-[var(--color-accent)] hover:bg-white/30">
        {photo ? 'Vymeniť fotku' : shown ? 'Vybrať inú fotku' : '+ Vybrať fotku'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>

      <Field label="Popis k fotke" hint="Voliteľné — zobrazí sa pod fotkou.">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          placeholder="napr. Prvá spoločná fotka na stanici"
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  )
}
