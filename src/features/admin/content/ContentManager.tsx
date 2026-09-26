import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from '../../../components/Modal'
import { PhotoLightbox } from '../../../components/PhotoLightbox'
import { getSignedPhotoUrls, removeChapterPhotos } from '../../../lib/storage'
import type { BlockQuestionConfig } from '../../chapters/types'
import {
  adminDeleteBlock,
  adminListBlockQrTokens,
  adminListBlocks,
  adminSwapBlockOrder,
  type ChapterBlockRow,
} from '../api'
import { QrIcon } from '../../qr-scanner/BlockQr'
import { PhotoForm } from './PhotoForm'
import { QrBlockForm } from './QrBlockForm'
import { QuestionEditorForm } from './QuestionEditorForm'
import { StoryForm } from './StoryForm'
import { getErrorMessage } from '../../../lib/errors'

type Kind = 'story' | 'photo' | 'question' | 'qr'
type OpenForm = { kind: Kind; block?: ChapterBlockRow } | null

const KIND_OF: Record<string, Kind> = {
  text: 'story',
  photo: 'photo',
  question: 'question',
  qr: 'qr',
}
const KIND_LABEL: Record<Kind, string> = {
  story: 'Príbeh',
  photo: 'Fotka',
  question: 'Otázka',
  qr: 'QR kód',
}
const FORM_TITLE: Record<Kind, [string, string]> = {
  story: ['Nový príbeh', 'Upraviť príbeh'],
  photo: ['Nová fotka', 'Upraviť fotku'],
  question: ['Nová otázka', 'Upraviť otázku'],
  qr: ['Nový QR kód', 'Upraviť QR kód'],
}

export function ContentManager({
  chapterId,
  mapPinId = null,
  parentBlockId = null,
  onChanged,
}: {
  chapterId: string
  /** Bez neho spravuje hlavný list kapitoly, s ním obsah miesta na mape. */
  mapPinId?: string | null
  /** Obsah pod QR kódom (príbehy, fotky, otázky, ktoré sa ukážu po naskenovaní). */
  parentBlockId?: string | null
  onChanged?: () => void
}) {
  const [blocks, setBlocks] = useState<ChapterBlockRow[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [qrWithToken, setQrWithToken] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<OpenForm>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const rows = await adminListBlocks(chapterId, mapPinId)
    setBlocks(rows)
    const [urls, tokens] = await Promise.all([
      getSignedPhotoUrls(rows.flatMap((r) => r.storage_path ?? [])),
      adminListBlockQrTokens(rows.filter((r) => r.block_type === 'qr').map((r) => r.id)),
    ])
    setPhotoUrls(urls)
    setQrWithToken(tokens)
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload zámerne nie je v deps, inak by re-render vytváral novú referenciu a spôsobil nekonečnú slučku
  }, [chapterId, mapPinId, parentBlockId])

  const ids = new Set(blocks.map((b) => b.id))
  const items = blocks
    .filter((b) =>
      parentBlockId
        ? b.parent_block_id === parentBlockId
        : !b.parent_block_id || !ids.has(b.parent_block_id),
    )
    .sort((a, b) => a.order_index - b.order_index)
  const childrenOf = (id: string) =>
    blocks
      .filter((b) => b.parent_block_id === id)
      .sort((a, b) => a.order_index - b.order_index)
  const descendantsOf = (id: string): ChapterBlockRow[] =>
    childrenOf(id).flatMap((c) => [c, ...descendantsOf(c.id)])
  const nextOrderIndex = items.reduce((max, b) => Math.max(max, b.order_index), 0) + 10
  // QR kód patrí do listu kapitoly alebo k mestu, nie do obsahu iného QR kódu.
  const kinds: Kind[] = parentBlockId
    ? ['story', 'photo', 'question']
    : ['story', 'photo', 'question', 'qr']

  async function remove(item: ChapterBlockRow) {
    const kind = KIND_OF[item.block_type]
    // Fotky príbehu, fotky-odmeny v listoch po odpovedi aj celý obsah pod QR kódom.
    const inside = descendantsOf(item.id)
    const withPhoto = inside.filter((c) => c.storage_path)
    const content = kind === 'qr' && inside.length > 0 ? ' aj s obsahom pod ním' : ''
    const extra = withPhoto.length > 0 ? ` (${withPhoto.length} fotiek)` : ''
    const label = kind === 'qr' ? KIND_LABEL[kind] : KIND_LABEL[kind].toLowerCase()
    if (!confirm(`Zmazať — ${label}${content}${extra}? Nedá sa to vrátiť.`)) return
    const paths = [item, ...withPhoto].flatMap((b) => b.storage_path ?? [])
    setError(null)
    try {
      await adminDeleteBlock(item.id) // deti zmaže ON DELETE CASCADE
    } catch (err) {
      const message = getErrorMessage(err)
      setError(
        message.includes('required_block_id')
          ? 'Túto otázku nemožno zmazať — od jej správnej odpovede závisí odomknutie inej kapitoly. Najprv tej kapitole zmeň podmienku v Nastaveniach kapitoly.'
          : `Zmazanie zlyhalo: ${message}`,
      )
      return
    }
    await removeChapterPhotos(paths)
    await reload()
    onChanged?.()
  }

  async function move(index: number, direction: -1 | 1) {
    const other = items[index + direction]
    if (!other) return
    await adminSwapBlockOrder(items[index], other)
    await reload()
  }

  function closeAndReload() {
    setForm(null)
    void reload()
    onChanged?.()
  }

  return (
    <div className="flex flex-col gap-3">
      {loading && <p className="text-sm text-[var(--color-muted)]">Načítavam…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && items.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--paper-border)] p-4 text-center text-sm text-[var(--color-muted)]">
          {parentBlockId
            ? 'Zatiaľ nič. Pridaj, čo sa ukáže po naskenovaní.'
            : 'Zatiaľ tu nič nie je. Začni pridaním príbehu.'}
        </p>
      )}

      {items.map((item, index) => (
        <ItemCard
          key={item.id}
          item={item}
          photos={childrenOf(item.id).filter((c) => c.block_type === 'photo')}
          outcomes={childrenOf(item.id).filter((c) => c.reveal_on)}
          photoUrls={photoUrls}
          missingQr={item.block_type === 'qr' && !qrWithToken.has(item.id)}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          onEdit={() => setForm({ kind: KIND_OF[item.block_type], block: item })}
          onDelete={() => void remove(item)}
          onMove={(dir) => void move(index, dir)}
        >
          {item.block_type === 'qr' && (
            <ContentManager
              chapterId={chapterId}
              mapPinId={mapPinId}
              parentBlockId={item.id}
              onChanged={() => void reload()}
            />
          )}
        </ItemCard>
      ))}

      <div
        className={`grid gap-2 ${kinds.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}
      >
        {kinds.map((kind) => (
          <button
            key={kind}
            onClick={() => setForm({ kind })}
            className="rounded-lg border border-[var(--color-accent)] px-2 py-2.5 text-sm font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-accent)] hover:text-white"
          >
            + {KIND_LABEL[kind]}
          </button>
        ))}
      </div>

      {form && (
        <Modal title={FORM_TITLE[form.kind][form.block ? 1 : 0]} onClose={closeAndReload}>
          {form.kind === 'story' && (
            <StoryForm
              chapterId={chapterId}
              mapPinId={mapPinId}
              parentBlockId={parentBlockId}
              story={form.block}
              photos={
                form.block
                  ? childrenOf(form.block.id).filter((c) => c.block_type === 'photo')
                  : []
              }
              photoUrls={photoUrls}
              nextOrderIndex={nextOrderIndex}
              onSaved={closeAndReload}
              onCancel={() => setForm(null)}
            />
          )}
          {form.kind === 'photo' && (
            <PhotoForm
              chapterId={chapterId}
              mapPinId={mapPinId}
              parentBlockId={parentBlockId}
              photo={form.block}
              currentUrl={
                form.block?.storage_path ? photoUrls[form.block.storage_path] : undefined
              }
              nextOrderIndex={nextOrderIndex}
              onSaved={closeAndReload}
              onCancel={() => setForm(null)}
            />
          )}
          {form.kind === 'question' && (
            <QuestionEditorForm
              chapterId={chapterId}
              mapPinId={mapPinId}
              parentBlockId={parentBlockId}
              question={form.block}
              outcomes={
                form.block ? childrenOf(form.block.id).filter((c) => c.reveal_on) : []
              }
              photoUrls={photoUrls}
              nextOrderIndex={nextOrderIndex}
              onSaved={closeAndReload}
              onCancel={() => setForm(null)}
            />
          )}
          {form.kind === 'qr' && (
            <QrBlockForm
              chapterId={chapterId}
              mapPinId={mapPinId}
              block={form.block}
              hasToken={form.block ? qrWithToken.has(form.block.id) : false}
              nextOrderIndex={nextOrderIndex}
              onSaved={closeAndReload}
              onCancel={() => setForm(null)}
            />
          )}
        </Modal>
      )}
    </div>
  )
}

function ItemCard({
  item,
  photos,
  outcomes,
  photoUrls,
  missingQr,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMove,
  children,
}: {
  item: ChapterBlockRow
  photos: ChapterBlockRow[]
  outcomes: ChapterBlockRow[]
  photoUrls: Record<string, string>
  missingQr: boolean
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
  children?: ReactNode
}) {
  const kind = KIND_OF[item.block_type]
  const config = (item.question_config ?? {}) as BlockQuestionConfig
  const thumbs =
    kind === 'photo'
      ? [item]
      : kind === 'question'
        ? outcomes.filter((o) => o.storage_path)
        : kind === 'qr'
          ? []
          : photos
  const outcomeFor = (result: 'correct' | 'wrong') =>
    outcomes.find((o) => o.reveal_on === result)
  const [preview, setPreview] = useState<ChapterBlockRow | null>(null)

  return (
    <div className="rounded-xl border border-[var(--paper-border)] bg-[var(--color-surface)] p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <span className="mb-1 inline-flex items-center gap-1 rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            {kind === 'qr' && <QrIcon className="h-3 w-3" />}
            {KIND_LABEL[kind]}
          </span>
          {kind === 'qr' && (
            <>
              <p className="font-medium">{item.title || 'Bez názvu'}</p>
              {item.body_markdown && (
                <p className="line-clamp-2 text-sm text-[var(--color-muted)]">
                  {item.body_markdown}
                </p>
              )}
              {missingQr && (
                <p className="mt-1 text-sm text-rose-600">
                  ⚠ QR kód chýba — otvor Upraviť a vygeneruj ho.
                </p>
              )}
            </>
          )}
          {kind === 'story' && (
            <>
              <p className="font-medium">{item.title || 'Bez názvu'}</p>
              <p className="line-clamp-2 text-sm text-[var(--color-muted)]">
                {item.body_markdown}
              </p>
            </>
          )}
          {kind === 'photo' && (
            <p className="text-sm text-[var(--color-muted)]">
              {item.caption || 'Bez popisu'}
            </p>
          )}
          {kind === 'question' && (
            <>
              <p className="font-medium">{item.body_markdown}</p>
              <p className="text-sm text-[var(--color-muted)]">
                {config.type === 'choice'
                  ? `Možnosti: ${(config.options ?? []).join(' · ')}`
                  : config.type === 'place'
                    ? '📍 Ukáže miesto na mape'
                    : 'Napíše odpoveď'}
              </p>
              {(['correct', 'wrong'] as const).map((result) => {
                const letter = outcomeFor(result)
                return (
                  <p
                    key={result}
                    className="line-clamp-1 text-sm text-[var(--color-muted)]"
                  >
                    <span className="font-medium text-[var(--color-text)]">
                      {result === 'correct' ? 'Po správnej: ' : 'Po nesprávnej: '}
                    </span>
                    {letter
                      ? letter.body_markdown?.trim() ||
                        (letter.storage_path ? '(iba fotka)' : '')
                      : '—'}
                    {letter?.storage_path && letter.body_markdown?.trim()
                      ? ' + fotka'
                      : ''}
                  </p>
                )
              })}
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center text-sm">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="px-2 py-0.5 disabled:opacity-25"
            aria-label="Posunúť vyššie"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="px-2 py-0.5 disabled:opacity-25"
            aria-label="Posunúť nižšie"
          >
            ↓
          </button>
        </div>
      </div>

      {thumbs.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {thumbs.map((p) =>
            p.storage_path && photoUrls[p.storage_path] ? (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreview(p)}
                aria-label="Zobraziť fotku"
                className="shrink-0 cursor-zoom-in"
              >
                <img
                  src={photoUrls[p.storage_path]}
                  alt=""
                  className="h-14 w-14 rounded object-cover"
                />
              </button>
            ) : (
              <div key={p.id} className="h-14 w-14 shrink-0 rounded bg-black/10" />
            ),
          )}
        </div>
      )}

      {preview?.storage_path && photoUrls[preview.storage_path] && (
        <PhotoLightbox
          src={photoUrls[preview.storage_path]}
          alt=""
          caption={preview.caption}
          onClose={() => setPreview(null)}
        />
      )}

      {children && (
        <div className="mt-3 flex flex-col gap-2 border-l-2 border-[var(--color-accent)]/30 pl-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Ukáže sa po naskenovaní
          </p>
          {children}
        </div>
      )}

      <div className="mt-3 flex gap-4 border-t border-[var(--paper-border)] pt-2 text-sm">
        <button onClick={onEdit} className="font-medium text-[var(--color-accent)]">
          Upraviť
        </button>
        <button onClick={onDelete} className="text-rose-600">
          Zmazať
        </button>
      </div>
    </div>
  )
}
