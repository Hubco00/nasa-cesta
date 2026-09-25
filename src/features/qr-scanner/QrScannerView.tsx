import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'

const SCANNER_ELEMENT_ID = 'qr-reader'

type ScannerStatus = 'starting' | 'scanning' | 'permission_denied' | 'error'

interface QrScannerViewProps {
  onScan: (token: string) => void
  disabled?: boolean
}

export function QrScannerView({ onScan, disabled }: QrScannerViewProps) {
  const [status, setStatus] = useState<ScannerStatus>('starting')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScannedRef = useRef<string | null>(null)

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
    scannerRef.current = scanner
    let stopped = false
    let started = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (stopped || disabled) return
          if (lastScannedRef.current === decodedText) return
          lastScannedRef.current = decodedText
          onScan(decodedText)
        },
        () => {
          // Bežné "nič nenájdené v tomto frame" — ignorujeme, nie je to chyba.
        },
      )
      .then(() => {
        started = true
        setStatus('scanning')
      })
      .catch(() => setStatus('permission_denied'))

    return () => {
      stopped = true
      // `stop()` na knižnici html5-qrcode vie vyhodiť aj synchrónnu výnimku
      // (nie iba rejected Promise), keď sa skener nikdy nestihol spustiť
      // (napr. zamietnuté povolenie kamery) — voláme ju preto iba ak `start`
      // naozaj uspel, a aj tak defenzívne v try/catch.
      if (!started) return
      try {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {
            /* skener už mohol byť zastavený */
          })
      } catch {
        /* skener už mohol byť zastavený */
      }
    }
  }, [disabled, onScan])

  return (
    <div className="flex flex-col gap-3">
      {status === 'permission_denied' && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Nepodarilo sa získať prístup ku kamere. Skontroluj, či máš v prehliadači
          povolený prístup ku kamere pre túto appku (nastavenia stránky → Kamera), a skús
          to znova.
        </p>
      )}
      <div
        id={SCANNER_ELEMENT_ID}
        className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-black"
      />
    </div>
  )
}
