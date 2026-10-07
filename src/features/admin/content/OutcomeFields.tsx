import { useState, type ChangeEvent } from 'react'
import { MediaThumb } from '../../../components/MediaThumb'
import {
  isVideoFile,
  isVideoPath,
  MEDIA_ACCEPT,
  mediaFileError,
} from '../../../lib/media'
import { inputClass } from './ui'

/** Rozpracovaný list po odpovedi (správnej alebo nesprávnej) vo formulári otázky. */
export interface OutcomeDraft {
  text: string
  caption: string
  /** Fotka, ktorá už je uložená (storage_path), ak ju admin neodstránil. */
  existingPath: string | null
  newFile: File | null
  newPreviewUrl: string | null
}

export function OutcomeFields({
  title,
  hint,
  placeholder,
  draft,
  existingUrl,
  onChange,
  onPickFile,
}: {
  title: string
  hint: string
  placeholder: string
  draft: OutcomeDraft
  existingUrl?: string
  onChange: (patch: Partial<OutcomeDraft>) => void
  onPickFile: (file: File | null) => void
}) {
  const previewSrc = draft.newPreviewUrl ?? (draft.existingPath ? existingUrl : undefined)
  const hasPhoto = Boolean(draft.newFile || draft.existingPath)
  const video = draft.newFile
    ? isVideoFile(draft.newFile)
    : isVideoPath(draft.existingPath)
  const [fileError, setFileError] = useState<string | null>(null)

  return (
    <fieldset className="flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--paper-border)] p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <p className="text-xs text-[var(--color-muted)]">{hint}</p>
      <textarea
        value={draft.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={4}
        placeholder={placeholder}
        aria-label={`${title} — text`}
        className={`${inputClass} leading-relaxed`}
      />

      {hasPhoto ? (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--paper-border)] p-2">
          {previewSrc ? (
            <MediaThumb src={previewSrc} video={video} />
          ) : (
            <div className="h-14 w-14 shrink-0 rounded bg-black/10" />
          )}
          <input
            value={draft.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder={
              video ? 'Popis k videu (voliteľné)' : 'Popis k fotke (voliteľné)'
            }
            aria-label={`${title} — popis fotky`}
            className={`${inputClass} text-sm`}
          />
          <button
            type="button"
            onClick={() => {
              onPickFile(null)
              onChange({ existingPath: null })
            }}
            className="shrink-0 px-1 text-sm text-rose-600"
          >
            Odstrániť
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--paper-border)] px-3 py-2.5 text-sm text-[var(--color-accent)] hover:bg-white/30">
          + Pridať fotku alebo video ako odmenu
          <input
            type="file"
            accept={MEDIA_ACCEPT}
            aria-label={`${title} — fotka alebo video`}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0] ?? null
              const problem = file ? mediaFileError(file) : null
              setFileError(problem)
              if (!problem) onPickFile(file)
              e.target.value = ''
            }}
            className="sr-only"
          />
        </label>
      )}
      {fileError && <p className="text-sm text-rose-600">{fileError}</p>}
    </fieldset>
  )
}
