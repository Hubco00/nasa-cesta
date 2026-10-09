// Inštalácia appky do telefónu (PWA). Chrome na Androide pošle udalosť
// `beforeinstallprompt` hneď pri načítaní — zachytíme ju čo najskôr (import
// v main.tsx) a ponuku spustíme až tlačidlom v appke.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // vlastné tlačidlo namiesto lišty prehliadača
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function canPromptInstall(): boolean {
  return deferred !== null
}

/** Otvorí systémovú ponuku inštalácie. Vráti true, ak ju používateľ potvrdil. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred
  if (!event) return false
  await event.prompt()
  const { outcome } = await event.userChoice
  // Udalosť sa dá použiť iba raz.
  deferred = null
  notify()
  return outcome === 'accepted'
}

export function isIos(): boolean {
  // iPadOS sa hlási ako Mac — prezradí ho až dotyková obrazovka.
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  )
}

export function isMobile(): boolean {
  return isIos() || /Android/i.test(navigator.userAgent)
}

/** Beží už ako nainštalovaná appka (bez lišty prehliadača)? */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
