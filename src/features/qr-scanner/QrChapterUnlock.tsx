import { useState } from 'react'
import { verifyQr } from '../chapters/api'
import { QrScannerView } from './QrScannerView'

type Phase = 'idle' | 'scanning' | 'verifying' | 'valid' | 'invalid'

interface QrChapterUnlockProps {
  chapterId: string
  conditionId: string | null
  successMessage?: string | null
  failureMessage?: string | null
  onCompleted: () => void
}

export function QrChapterUnlock({
  chapterId,
  conditionId,
  successMessage,
  failureMessage,
  onCompleted,
}: QrChapterUnlockProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [scannerKey, setScannerKey] = useState(0)

  async function handleScan(token: string) {
    setPhase('verifying')
    try {
      const result = await verifyQr(chapterId, conditionId, token)
      if (result.valid) {
        setPhase('valid')
        onCompleted()
      } else {
        setPhase('invalid')
      }
    } catch {
      setPhase('invalid')
    }
  }

  function retry() {
    setScannerKey((k) => k + 1)
    setPhase('scanning')
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-5 shadow-sm">
      <p className="text-sm text-[var(--color-muted)]">
        Nájdi QR kód na správnom mieste a naskenuj ho. Prístup ku kamere sa vyžiada až po
        otvorení skenera.
      </p>

      {phase === 'idle' && (
        <button
          onClick={() => setPhase('scanning')}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90"
        >
          Otvoriť skener
        </button>
      )}

      {(phase === 'scanning' || phase === 'verifying') && (
        <QrScannerView
          key={scannerKey}
          onScan={handleScan}
          disabled={phase === 'verifying'}
        />
      )}

      {phase === 'verifying' && (
        <p className="text-center text-sm text-[var(--color-muted)]">Overujem QR kód…</p>
      )}

      {phase === 'valid' && (
        <p className="animate-unlock font-medium text-[var(--color-accent)]">
          {successMessage ?? 'QR kód sedí.'}
        </p>
      )}

      {phase === 'invalid' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-rose-600">
            {failureMessage ?? 'Tento QR kód sem nepatrí.'}
          </p>
          <button
            onClick={retry}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90"
          >
            Skenovať znova
          </button>
        </div>
      )}
    </div>
  )
}
