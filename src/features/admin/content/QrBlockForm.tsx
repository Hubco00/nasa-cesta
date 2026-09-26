import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import { qrCodeDataUrl, randomQrToken } from '../../../lib/qrCode'
import {
  adminCreateBlock,
  adminSetBlockQrToken,
  adminUpdateBlock,
  type ChapterBlockRow,
} from '../api'
import { QrCodePreview } from '../QrCodePreview'
import { Field, FormActions, inputClass } from './ui'

function fileNameFor(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `qr-${slug || 'kod'}.png`
}

export function QrBlockForm({
  chapterId,
  mapPinId,
  block,
  hasToken,
  nextOrderIndex,
  onSaved,
  onCancel,
}: {
  chapterId: string
  mapPinId: string | null
  block?: ChapterBlockRow
  hasToken: boolean
  nextOrderIndex: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(block?.title ?? '')
  const [hint, setHint] = useState(block?.body_markdown ?? '')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [created, setCreated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function issueToken(blockId: string) {
    const token = randomQrToken()
    await adminSetBlockQrToken(blockId, token)
    setQrDataUrl(await qrCodeDataUrl(token))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const fields = { title: title.trim() || null, body_markdown: hint.trim() || null }
    try {
      if (block) {
        await adminUpdateBlock(block.id, fields)
        onSaved()
        return
      }
      const row = await adminCreateBlock({
        chapter_id: chapterId,
        map_pin_id: mapPinId,
        block_type: 'qr',
        order_index: nextOrderIndex,
        ...fields,
      })
      await issueToken(row.id)
      setCreated(true)
    } catch (err) {
      setError(`Uloženie zlyhalo: ${getErrorMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function regenerate() {
    if (!block) return
    if (
      hasToken &&
      !confirm('Vygenerovať nový QR kód? Starý (aj vytlačený) prestane fungovať.')
    )
      return
    setSaving(true)
    setError(null)
    try {
      await issueToken(block.id)
    } catch (err) {
      setError(`Nový QR kód sa nepodarilo vytvoriť: ${getErrorMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const saveNote = (
    <p className="text-sm text-[var(--color-muted)]">
      Stiahni si ho alebo vytlač <strong>teraz</strong> — z bezpečnostných dôvodov sa
      ukladá iba jeho odtlačok a neskôr sa už znova zobraziť nedá. Keď ho stratíš,
      vygeneruj nový.
    </p>
  )

  if (created && qrDataUrl) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-medium text-[var(--color-accent)]">✓ QR kód je vytvorený</p>
        <QrCodePreview dataUrl={qrDataUrl} fileName={fileNameFor(title)} />
        {saveNote}
        <p className="text-sm text-[var(--color-muted)]">
          Príbeh, fotku alebo otázku, ktoré sa ukážu po naskenovaní, pridáš v zozname
          priamo pod týmto QR kódom.
        </p>
        <button
          onClick={onSaved}
          className="self-end rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white"
        >
          Hotovo
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Názov" hint="Voliteľné — hráčka ho uvidí ako nadpis.">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="napr. Tajomstvo pod lavičkou"
          className={inputClass}
        />
      </Field>

      <Field
        label="Text pred naskenovaním"
        hint="Voliteľné — nápoveda, kde QR kód hľadať. Obsah za ním uvidí až po naskenovaní."
      >
        <textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          rows={4}
          placeholder="napr. Hľadaj tam, kde sme sa prvýkrát pobozkali…"
          className={`${inputClass} leading-relaxed`}
        />
      </Field>

      {block ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--paper-border)] p-3">
          <span className="text-sm font-medium">QR kód</span>
          {qrDataUrl ? (
            <>
              <QrCodePreview dataUrl={qrDataUrl} fileName={fileNameFor(title)} />
              {saveNote}
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              {hasToken
                ? '✓ Nastavený. Obrázok sa z bezpečnostných dôvodov dá zobraziť iba pri vytvorení.'
                : '⚠ Chýba — vygeneruj ho, inak sa obsah nedá odomknúť.'}
            </p>
          )}
          <button
            type="button"
            onClick={() => void regenerate()}
            disabled={saving}
            className="self-start rounded-lg border border-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent)] disabled:opacity-60"
          >
            {hasToken || qrDataUrl ? 'Vygenerovať nový QR kód' : 'Vygenerovať QR kód'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          Po vytvorení sa zobrazí QR kód na stiahnutie a vytlačenie. Obsah, ktorý sa ukáže
          po naskenovaní, pridáš potom pod ním.
        </p>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <FormActions
        saving={saving}
        onCancel={qrDataUrl ? onSaved : onCancel}
        submitLabel={block ? 'Uložiť' : 'Vytvoriť QR kód'}
      />
    </form>
  )
}
