// Ktoré miesta na mape už hráčka otvorila — iba lokálne na zariadení, slúži
// len na notifikačné guličky. Pri nedostupnom localStorage (súkromné okno,
// zablokované úložisko) sa všetko jednoducho javí ako neotvorené.
const STORAGE_KEY = 'nasa-cesta:seen-map-pins'

export function loadSeenPins(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function markPinSeen(pinId: string): Set<string> {
  const seen = loadSeenPins()
  seen.add(pinId)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
  } catch {
    // úložisko nedostupné — gulička sa zobrazí znova pri ďalšom načítaní
  }
  return seen
}
