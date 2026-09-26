import { useCallback, useMemo, useState } from 'react'
import { renderMarkdownSafe } from '../../lib/security'
import { BlockQr } from '../qr-scanner/BlockQr'
import { BlockQuestion } from '../questions/BlockQuestion'
import { LetterPhotos, PhotoFigure } from './PhotoFigure'
import { buildTree, type BlockNode } from './blockTree'
import type { ChapterBlock } from './types'

export type Reveal = (blocks: ChapterBlock[]) => void

export function BlockNodeView({
  node,
  depth,
  index,
  onReveal,
  onSolved,
}: {
  node: BlockNode
  depth: number
  index: number
  onReveal: Reveal
  /** Iba pre krok kapitoly: otázka zodpovedaná / QR naskenovaný. */
  onSolved?: () => void
}) {
  // Fotky pripojené k príbehu sa kreslia priamo do jeho listu; ostatné
  // vnorené bloky zostávajú zvlášť. Deti otázky rieši BlockQuestion, obsah
  // pod QR kódom BlockQr.
  const letterPhotos =
    node.block_type === 'text'
      ? node.children.filter((c) => c.block_type === 'photo' && c.storage_path)
      : []
  const nestedChildren =
    node.block_type === 'question' || node.block_type === 'qr'
      ? []
      : node.children.filter((c) => !letterPhotos.includes(c))

  return (
    <div
      className="animate-fade-in-up"
      style={{
        animationDelay: `${Math.min(index * 60, 600)}ms`,
        marginLeft: depth > 0 ? '1.25rem' : 0,
      }}
    >
      {node.block_type === 'text' &&
        (node.body_markdown?.trim() || letterPhotos.length > 0) && (
          <div className="paper rounded-lg p-5 sm:p-6">
            {node.title && (
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-accent)]">
                {node.title}
              </h2>
            )}
            {node.body_markdown?.trim() && (
              <div
                className="prose-romantic font-[family-name:var(--font-body)]"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownSafe(node.body_markdown),
                }}
              />
            )}
            <LetterPhotos
              photos={letterPhotos.map((p) => ({
                storagePath: p.storage_path!,
                alt: p.alt_text,
                caption: p.caption,
              }))}
            />
          </div>
        )}

      {node.block_type === 'photo' && node.storage_path && (
        <PhotoFigure
          storagePath={node.storage_path}
          alt={node.alt_text}
          caption={node.caption}
        />
      )}

      {node.block_type === 'question' && (
        <BlockQuestion block={node} onSolved={onSolved} />
      )}

      {node.block_type === 'qr' && (
        <BlockQr
          block={node}
          hasContent={node.children.length > 0}
          onRevealed={onReveal}
          onSolved={onSolved}
        >
          {node.children.map((child, i) => (
            <BlockNodeView
              key={child.id}
              node={child}
              depth={depth}
              index={i}
              onReveal={onReveal}
            />
          ))}
        </BlockQr>
      )}

      {nestedChildren.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-l-2 border-rose-200/50 pl-3">
          {nestedChildren.map((child, i) => (
            <BlockNodeView
              key={child.id}
              node={child}
              depth={depth + 1}
              index={i}
              onReveal={onReveal}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ChapterBlockRenderer({ blocks }: { blocks: ChapterBlock[] }) {
  // Obsah, ktorý server vydal až po naskenovaní QR kódu.
  const [revealed, setRevealed] = useState<ChapterBlock[]>([])
  const reveal = useCallback<Reveal>(
    (more) => setRevealed((prev) => [...prev, ...more]),
    [],
  )

  const tree = useMemo(() => {
    const known = new Set(blocks.map((b) => b.id))
    const extra = revealed
      .filter((b) => !known.has(b.id))
      .sort((a, b) => a.order_index - b.order_index)
    return buildTree([...blocks, ...extra])
  }, [blocks, revealed])

  if (blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {tree.map((node, i) => (
        <BlockNodeView key={node.id} node={node} depth={0} index={i} onReveal={reveal} />
      ))}
    </div>
  )
}
