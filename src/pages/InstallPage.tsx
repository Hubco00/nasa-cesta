import { useState, useSyncExternalStore } from 'react'
import {
  canPromptInstall,
  isIos,
  promptInstall,
  subscribeInstall,
} from '../lib/installPrompt'

/**
 * V prehliadači v mobile sa appka nehrá — iba sa odtiaľto nainštaluje.
 * Prihlásenie a kapitoly sú až v nainštalovanej appke (ikonka na ploche).
 */
export function InstallPage() {
  const available = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false)
  const [installed, setInstalled] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl bg-[var(--color-surface)] p-8 text-center shadow-lg shadow-rose-900/5">
        <img src="/pwa-192x192.png" alt="" className="h-20 w-20 rounded-2xl shadow-sm" />
        <div>
          <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">
            Naša cesta
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Nainštaluj si appku do telefónu a otvor ju ikonkou na ploche.
          </p>
        </div>

        {installed ? (
          <p className="font-medium text-[var(--color-accent)]">
            Hotovo — otvor Našu cestu z plochy telefónu.
          </p>
        ) : isIos() ? (
          <ol className="flex flex-col gap-2 text-left text-sm">
            <li>1. Otvor túto stránku v Safari.</li>
            <li>
              2. Ťukni dole na <span className="font-medium">Zdieľať</span> (štvorček so
              šípkou hore).
            </li>
            <li>
              3. Zvoľ <span className="font-medium">Pridať na plochu</span>.
            </li>
          </ol>
        ) : available ? (
          <button
            type="button"
            onClick={() => void promptInstall().then(setInstalled)}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-3 font-medium text-white transition hover:opacity-90"
          >
            Nainštalovať appku
          </button>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p>
              V Chrome ťukni vpravo hore na ⋮ a zvoľ{' '}
              <span className="font-medium">Inštalovať aplikáciu</span> (alebo „Pridať na
              plochu“).
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Už ju máš nainštalovanú? Otvor ju ikonkou na ploche.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
