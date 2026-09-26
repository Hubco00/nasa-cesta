import { useEffect, useRef, useState, type FormEvent } from 'react'
import { removeChapterPhotos, uploadChapterPhoto } from '../../../lib/storage'
import { adminCreateBlock, adminUpdateBlock, type ChapterBlockRow } from '../api'
import { getErrorMessage } from '../../../lib/errors'
import { StepGateFields } from './StepGateFields'
import { Field, FormActions, inputClass } from './ui'
import { useStepGate } from './useStepGate'

export function PhotoForm({
  chapterId,
  mapPinId,
  parentBlockId = null,
  photo,
  currentUrl,
  nextOrderIndex,
  onSaved,
  onCancel,
}: {
  chapterId: string
  mapPinId: string | null
  /** Pod QR kódom — ukáže sa až po jeho naskenovaní. */
  parentBlockId?: string | null
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
  // Pokračovanie (Ďalej / poloha) má zmysel iba pre krok hlavného listu kapitoly.
  const isStep = !mapPinId && !parentBlockId
  const gate = useStepGate(photo)

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
    const gateError = isStep ? gate.validate() : null
    if (gateError) return setError(gateError)
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
        if (isStep) await gate.save(photo.id)
      } else {
        const path = await uploadChapterPhoto(chapterId, file!)
        const created = await adminCreateBlock({
          chapter_id: chapterId,
          map_pin_id: mapPinId,
          parent_block_id: parentBlockId,
          block_type: 'photo',
          order_index: nextOrderIndex,
          storage_path: path,
          caption: caption || null,
        })
        if (isStep) await gate.save(created.id)
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

      {isStep && <StepGateFields state={gate} />}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  )
}
