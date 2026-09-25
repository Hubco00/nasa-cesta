import { useMemo } from 'react'
import { renderMarkdownSafe } from '../../lib/security'
import { BlockQuestion } from '../questions/BlockQuestion'
import { LetterPhotos, PhotoFigure } from './PhotoFigure'
import type { ChapterBlock } from './types'

interface BlockNode extends ChapterBlock {
  children: BlockNode[]
}

function buildTree(blocks: ChapterBlock[]): BlockNode[] {
  const nodes = new Map<string, BlockNode>()
  for (const block of blocks) nodes.set(block.id, { ...block, children: [] })

  const roots: BlockNode[] = []
  for (const block of blocks) {
    const node = nodes.get(block.id)!
    if (block.parent_block_id && nodes.has(block.parent_block_id)) {
      nodes.get(block.parent_block_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function BlockNodeView({
  node,
  depth,
  index,
}: {
  node: BlockNode
  depth: number
  index: number
}) {
  // Fotky pripojené k príbehu sa kreslia priamo do jeho listu; ostatné
  // vnorené bloky (a deti otázky, ktoré rieši BlockQuestion) zostávajú zvlášť.
  const letterPhotos =
    node.block_type === 'text'
      ? node.children.filter((c) => c.block_type === 'photo' && c.storage_path)
      : []
  const nestedChildren =
    node.block_type === 'question'
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

      {node.block_type === 'question' && <BlockQuestion block={node} />}

      {nestedChildren.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-l-2 border-rose-200/50 pl-3">
          {nestedChildren.map((child, i) => (
            <BlockNodeView key={child.id} node={child} depth={depth + 1} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ChapterBlockRenderer({ blocks }: { blocks: ChapterBlock[] }) {
  const tree = useMemo(() => buildTree(blocks), [blocks])

  if (blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {tree.map((node, i) => (
        <BlockNodeView key={node.id} node={node} depth={0} index={i} />
      ))}
    </div>
  )
}
