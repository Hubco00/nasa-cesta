import QRCode from 'qrcode'
import { useState } from 'react'
import { adminSetQrToken } from './api'

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `quest_${hex}`
}

export function QrTokenEditor({
  chapterId,
  conditionId,
}: {
  chapterId: string
  conditionId: string | null
}) {
  const [token, setToken] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function generate() {
    const next = randomToken()
    setToken(next)
    setSaved(false)
    setQrDataUrl(await QRCode.toDataURL(next, { margin: 2, width: 320 }))
  }

  async function save() {
    if (!token) return
    setSaving(true)
    try {
      await adminSetQrToken(chapterId, conditionId, token)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rose-200 p-4">
      <p className="text-sm text-[var(--color-muted)]">
        Vygeneruj náhodný token, ulož ho (uloží sa iba jeho hash) a QR kód si stiahni
        alebo vytlač. Po opustení tejto stránky sa plaintext token už nedá znova zobraziť
        — v prípade potreby vygeneruj nový.
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => void generate()}
          className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white"
        >
          Vygenerovať nový QR token
        </button>
        {token && (
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg border border-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent)] disabled:opacity-60"
          >
            {saving ? 'Ukladám…' : saved ? 'Uložené ✓' : 'Uložiť token'}
          </button>
        )}
      </div>

      {qrDataUrl && (
        <div className="flex flex-col items-center gap-2">
          <img src={qrDataUrl} alt="QR kód" className="h-40 w-40" />
          <a
            href={qrDataUrl}
            download={`qr-${token}.png`}
            className="text-sm text-[var(--color-accent)] underline"
          >
            Stiahnuť QR kód
          </a>
        </div>
      )}
    </div>
  )
}
