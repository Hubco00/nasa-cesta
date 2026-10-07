import { useState, useSyncExternalStore } from 'react'
import {
  canPromptInstall,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from '../lib/installPrompt'

// Zavretie platí do ďalšieho otvorenia appky v prehliadači.
let dismissed = false

/** Ponuka nainštalovať Našu cestu do telefónu ako aplikáciu. */
export function InstallBanner({ className = '' }: { className?: string }) {
  const available = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false)
  const [hidden, setHidden] = useState(dismissed)
  const isAndroid = /Android/i.test(navigator.userAgent)

  if (hidden || isStandalone()) return null
  // Bez ponuky od prehliadača (napr. iný prehliadač než Chrome) aspoň poradíme.
  if (!available && !isAndroid) return null

  function close() {
    dismissed = true
    setHidden(true)
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-[var(--paper-border)] bg-[var(--color-surface)] p-4 shadow-sm ${className}`}
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        📲
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm">
          <span className="font-medium">Nainštaluj si Našu cestu do telefónu</span> — bude
          medzi aplikáciami s vlastnou ikonou a otvorí sa na celú obrazovku.
        </p>
        {available ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="self-start rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Nainštalovať
          </button>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            V Chrome ťukni vpravo hore na ⋮ a zvoľ „Inštalovať aplikáciu“ (alebo „Pridať
            na plochu“).
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Teraz nie"
        className="shrink-0 px-1 text-[var(--color-muted)]"
      >
        ✕
      </button>
    </div>
  )
}
