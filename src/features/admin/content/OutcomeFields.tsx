import type { ChangeEvent } from 'react'
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

  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-[var(--paper-border)] p-3">
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
            <img
              src={previewSrc}
              alt=""
              className="h-14 w-14 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-14 w-14 shrink-0 rounded bg-black/10" />
          )}
          <input
            value={draft.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Popis k fotke (voliteľné)"
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
          + Pridať fotku ako odmenu
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label={`${title} — fotka`}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              onPickFile(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
            className="sr-only"
          />
        </label>
      )}
    </fieldset>
  )
}
