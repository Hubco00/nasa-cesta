import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
      Si offline. Táto stránka sa zobrazuje z pamäte — nové kapitoly, QR aj GPS overenie
      budú fungovať znova, až keď sa pripojíš na internet.
    </div>
  )
}
