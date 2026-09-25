import type { ReactNode } from 'react'

export const inputClass =
  'w-full rounded-lg border border-[var(--paper-border)] bg-white/60 px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] dark:bg-black/20'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  )
}

export function FormActions({
  saving,
  onCancel,
  submitLabel = 'Uložiť',
}: {
  saving: boolean
  onCancel: () => void
  submitLabel?: string
}) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t border-[var(--paper-border)] bg-[var(--color-bg)] px-5 py-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        Zrušiť
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Ukladám…' : submitLabel}
      </button>
    </div>
  )
}
