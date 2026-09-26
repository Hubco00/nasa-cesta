import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from '../../components/Modal'
import { renderMarkdownSafe } from '../../lib/security'
import { fetchBlockDescendants, fetchBlockSolved, verifyBlockQr } from '../chapters/api'
import type { ChapterBlock } from '../chapters/types'
import { QrScannerView } from './QrScannerView'

type State = 'loading' | 'locked' | 'unlocked'
type ScanPhase = 'scanning' | 'verifying' | 'invalid' | 'failed'

/**
 * QR kód v obsahu. Kým ho hráčka nenaskenuje, vidí iba nápovedu — obsah pod
 * ním jej server ani nepošle. Po overení ho načíta a odovzdá `onRevealed`.
 */
export function BlockQr({
  block,
  hasContent,
  onRevealed,
  children,
}: {
  block: ChapterBlock
  /** Obsah pod QR kódom už prišiel (naskenovaný skôr, alebo pozerá admin). */
  hasContent: boolean
  onRevealed: (blocks: ChapterBlock[]) => void
  children: ReactNode
}) {
  const [state, setState] = useState<State>(hasContent ? 'unlocked' : 'loading')
  const [justFound, setJustFound] = useState(false)
  const [scan, setScan] = useState<ScanPhase | null>(null)
  const [scannerKey, setScannerKey] = useState(0)

  useEffect(() => {
    if (hasContent) return
    let active = true
    fetchBlockSolved(block.id)
      .then((solved) => {
        if (active) setState(solved ? 'unlocked' : 'locked')
      })
      .catch(() => {
        if (active) setState('locked')
      })
    return () => {
      active = false
    }
  }, [block.id, hasContent])

  async function handleScan(token: string) {
    setScan('verifying')
    try {
      if (!(await verifyBlockQr(block.id, token))) {
        setScan('invalid')
        return
      }
      onRevealed(await fetchBlockDescendants(block))
      setScan(null)
      setJustFound(true)
      setState('unlocked')
    } catch {
      setScan('failed')
    }
  }

  function scanAgain() {
    setScannerKey((k) => k + 1)
    setScan('scanning')
  }

  const heading = block.title?.trim() || 'QR kód'

  if (state === 'unlocked') {
    return (
      <div className="flex flex-col gap-4">
        <p
          className={`flex items-center gap-2 font-[family-name:var(--font-display)] text-sm tracking-wide text-[var(--color-accent)] ${
            justFound ? 'animate-unlock' : ''
          }`}
        >
          <QrIcon className="h-4 w-4" />
          {justFound ? `${heading} — našla si ho!` : `${heading} ✓`}
        </p>
        {children}
      </div>
    )
  }

  return (
    <div className="paper rounded-lg p-5">
      <p className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-xs tracking-wider opacity-70">
        <QrIcon className="h-3.5 w-3.5" />
        {block.title?.trim() ? 'QR kód' : 'Skrytý QR kód'}
      </p>
      {block.title?.trim() && (
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg text-[var(--color-accent)]">
          {block.title}
        </h2>
      )}
      {block.body_markdown?.trim() ? (
        <div
          className="prose-romantic"
          dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(block.body_markdown) }}
        />
      ) : (
        <p>
          Niekde je ukrytý QR kód. Nájdi ho a naskenuj — ukáže ti, čo sa za ním skrýva.
        </p>
      )}

      <button
        onClick={() => setScan('scanning')}
        disabled={state === 'loading'}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        <QrIcon className="h-5 w-5" />
        Naskenovať QR kód
      </button>

      {scan && (
        <Modal title="Naskenuj QR kód" onClose={() => setScan(null)}>
          <div className="flex flex-col gap-3">
            {(scan === 'scanning' || scan === 'verifying') && (
              <>
                <QrScannerView
                  key={scannerKey}
                  onScan={handleScan}
                  disabled={scan === 'verifying'}
                />
                <p className="text-center text-sm text-[var(--color-muted)]">
                  {scan === 'verifying'
                    ? 'Overujem QR kód…'
                    : 'Namier kameru na QR kód. Prístup ku kamere sa vyžiada iba teraz.'}
                </p>
              </>
            )}

            {(scan === 'invalid' || scan === 'failed') && (
              <>
                <p className="text-center text-rose-700">
                  {scan === 'invalid'
                    ? 'Tento QR kód sem nepatrí. Hľadaj ďalej…'
                    : 'QR kód sa nepodarilo overiť — skontroluj pripojenie na internet.'}
                </p>
                <button
                  onClick={scanAgain}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:opacity-90"
                >
                  Skenovať znova
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export function QrIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </svg>
  )
}
