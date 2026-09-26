import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useId, useRef, useState } from 'react'

type ScannerStatus = 'starting' | 'scanning' | 'permission_denied' | 'error'

interface QrScannerViewProps {
  onScan: (token: string) => void
  disabled?: boolean
}

function stopScanner(scanner: Html5Qrcode) {
  // `stop()` na knižnici html5-qrcode vie vyhodiť aj synchrónnu výnimku (nie
  // iba rejected Promise) — preto defenzívne v try/catch.
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

export function QrScannerView({ onScan, disabled }: QrScannerViewProps) {
  // Na stránke môže byť viac skenerov (QR odomknutie kapitoly aj QR v obsahu).
  const elementId = `qr-reader-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [status, setStatus] = useState<ScannerStatus>('starting')
  const lastScannedRef = useRef<string | null>(null)
  // Cez ref, aby nová referencia callbacku pri re-renderi nereštartovala kameru.
  const onScanRef = useRef(onScan)
  const disabledRef = useRef(disabled)
  useEffect(() => {
    onScanRef.current = onScan
    disabledRef.current = disabled
  }, [onScan, disabled])

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId)
    let started = false
    let disposed = false

    // Štart až po aktuálnom tiku: React StrictMode komponent v dev režime hneď
    // odpojí a znova pripojí — prvý pokus sa tak zruší skôr, než zapne kameru.
    const timer = setTimeout(() => {
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (disposed || disabledRef.current) return
            if (lastScannedRef.current === decodedText) return
            lastScannedRef.current = decodedText
            onScanRef.current(decodedText)
          },
          () => {
            // Bežné "nič nenájdené v tomto frame" — ignorujeme, nie je to chyba.
          },
        )
        .then(() => {
          started = true
          // Komponent zmizol skôr, než sa kamera stihla spustiť.
          if (disposed) stopScanner(scanner)
          else setStatus('scanning')
        })
        .catch(() => {
          if (!disposed) setStatus('permission_denied')
        })
    }, 0)

    return () => {
      disposed = true
      clearTimeout(timer)
      if (started) stopScanner(scanner)
    }
  }, [elementId])

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
        id={elementId}
        className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-black"
      />
    </div>
  )
}
