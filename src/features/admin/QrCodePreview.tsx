import { useState } from 'react'
import { printQrCode } from '../../lib/qrCode'

/** Vygenerovaný QR kód s možnosťou stiahnuť ho alebo vytlačiť. */
export function QrCodePreview({
  dataUrl,
  fileName,
}: {
  dataUrl: string
  fileName: string
}) {
  const [blocked, setBlocked] = useState(false)

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={dataUrl}
        alt="QR kód"
        className="h-48 w-48 rounded-lg bg-white p-1 shadow-sm"
      />
      <div className="flex gap-2">
        <a
          href={dataUrl}
          download={fileName}
          className="rounded-lg border border-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent)]"
        >
          Stiahnuť
        </a>
        <button
          type="button"
          onClick={() => setBlocked(!printQrCode(dataUrl, fileName))}
          className="rounded-lg border border-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent)]"
        >
          Vytlačiť
        </button>
      </div>
      {blocked && (
        <p className="text-center text-xs text-rose-600">
          Prehliadač zablokoval okno na tlač — povoľ vyskakovacie okná alebo QR kód
          stiahni.
        </p>
      )}
    </div>
  )
}
