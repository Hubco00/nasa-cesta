import { useEffect, useMemo, useState } from 'react'
import { getSignedPhotoUrls } from '../../lib/storage'
import { renderMarkdownSafe } from '../../lib/security'
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
  return (
    <div
      className="animate-fade-in-up"
      style={{
        animationDelay: `${Math.min(index * 60, 600)}ms`,
        marginLeft: depth > 0 ? '1.25rem' : 0,
      }}
    >
      {node.block_type === 'text' && node.body_markdown && (
        <div className="paper rounded-lg p-5 sm:p-6">
          <div
            className="prose-romantic font-[family-name:var(--font-body)]"
            dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(node.body_markdown) }}
          />
        </div>
      )}

      {node.block_type === 'photo' && <PhotoBlock node={node} />}

      {node.children.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-l-2 border-rose-200/50 pl-3">
          {node.children.map((child, i) => (
            <BlockNodeView key={child.id} node={child} depth={depth + 1} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function PhotoBlock({ node }: { node: BlockNode }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!node.storage_path) return
    getSignedPhotoUrls([node.storage_path]).then((urls) => {
      if (active) setUrl(urls[node.storage_path!] ?? null)
    })
    return () => {
      active = false
    }
  }, [node.storage_path])

  return (
    <figure className="overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-sm">
      {url ? (
        <img
          src={url}
          alt={node.alt_text ?? ''}
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="aspect-[4/3] w-full animate-pulse bg-rose-100" />
      )}
      {node.caption && (
        <figcaption className="px-4 py-3 text-sm italic text-[var(--color-muted)]">
          {node.caption}
        </figcaption>
      )}
    </figure>
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
