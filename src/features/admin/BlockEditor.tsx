import { useEffect, useState, type ChangeEvent } from 'react'
import { getSignedPhotoUrls, uploadChapterPhoto } from '../../lib/storage'
import {
  adminCreateBlock,
  adminDeleteBlock,
  adminListBlocks,
  adminSwapBlockOrder,
  type ChapterBlockRow,
} from './api'

interface TreeNode extends ChapterBlockRow {
  children: TreeNode[]
}

function buildTree(blocks: ChapterBlockRow[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>()
  for (const b of blocks) nodes.set(b.id, { ...b, children: [] })
  const roots: TreeNode[] = []
  for (const b of blocks) {
    const node = nodes.get(b.id)!
    if (b.parent_block_id && nodes.has(b.parent_block_id)) {
      nodes.get(b.parent_block_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function BlockEditor({ chapterId }: { chapterId: string }) {
  const [blocks, setBlocks] = useState<ChapterBlockRow[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [newText, setNewText] = useState('')
  const [newParent, setNewParent] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')

  async function reload() {
    const rows = await adminListBlocks(chapterId)
    setBlocks(rows)
    const paths = rows.filter((r) => r.storage_path).map((r) => r.storage_path!)
    setPhotoUrls(await getSignedPhotoUrls(paths))
  }

  useEffect(() => {
    void (async () => {
      await reload()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload zámerne nie je v deps, inak by re-render vytváral novú referenciu a spôsobil nekonečnú slučku
  }, [chapterId])

  async function addTextBlock() {
    if (!newText.trim()) return
    const siblingCount = blocks.filter(
      (b) => (b.parent_block_id ?? '') === (newParent || ''),
    ).length
    await adminCreateBlock({
      chapter_id: chapterId,
      parent_block_id: newParent || null,
      block_type: 'text',
      order_index: (siblingCount + 1) * 10,
      body_markdown: newText,
    })
    setNewText('')
    await reload()
  }

  async function addPhotoBlock(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadChapterPhoto(chapterId, file)
      const siblingCount = blocks.filter(
        (b) => (b.parent_block_id ?? '') === (newParent || ''),
      ).length
      await adminCreateBlock({
        chapter_id: chapterId,
        parent_block_id: newParent || null,
        block_type: 'photo',
        order_index: (siblingCount + 1) * 10,
        storage_path: path,
        caption: caption || null,
      })
      setCaption('')
      await reload()
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function remove(id: string) {
    if (!confirm('Zmazať tento blok? Táto akcia sa nedá vrátiť späť.')) return
    await adminDeleteBlock(id)
    await reload()
  }

  async function move(node: ChapterBlockRow, direction: -1 | 1) {
    const siblings = blocks
      .filter((b) => b.parent_block_id === node.parent_block_id)
      .sort((a, b) => a.order_index - b.order_index)
    const index = siblings.findIndex((s) => s.id === node.id)
    const other = siblings[index + direction]
    if (!other) return
    await adminSwapBlockOrder(node, other)
    await reload()
  }

  const tree = buildTree(blocks)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-rose-200 p-4">
        <label className="text-sm font-medium">Pripojiť k bloku (voliteľné)</label>
        <select
          value={newParent}
          onChange={(e) => setNewParent(e.target.value)}
          className="rounded-lg border border-rose-200 bg-transparent px-2 py-1.5 text-sm"
        >
          <option value="">— na najvyššiu úroveň —</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.block_type === 'text'
                ? (b.body_markdown ?? '').slice(0, 40)
                : `📷 ${b.caption ?? b.id}`}
            </option>
          ))}
        </select>

        <label className="mt-2 text-sm font-medium">Pridať text</label>
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          rows={3}
          placeholder="Napíš ďalší kúsok príbehu (podporuje Markdown)…"
          className="rounded-lg border border-rose-200 bg-transparent px-3 py-2 text-sm"
        />
        <button
          onClick={() => void addTextBlock()}
          className="self-start rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white"
        >
          + Pridať text
        </button>

        <label className="mt-3 text-sm font-medium">Pridať fotku</label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Popisok k fotke (voliteľné)…"
          className="rounded-lg border border-rose-200 bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => void addPhotoBlock(e)}
          disabled={uploading}
        />
        {uploading && <p className="text-xs text-[var(--color-muted)]">Nahrávam…</p>}
      </div>

      <div className="flex flex-col gap-2">
        {tree.map((node) => (
          <BlockNode
            key={node.id}
            node={node}
            depth={0}
            photoUrls={photoUrls}
            onMove={move}
            onRemove={remove}
          />
        ))}
      </div>
    </div>
  )
}

function BlockNode({
  node,
  depth,
  photoUrls,
  onMove,
  onRemove,
}: {
  node: TreeNode
  depth: number
  photoUrls: Record<string, string>
  onMove: (node: ChapterBlockRow, dir: -1 | 1) => void
  onRemove: (id: string) => void
}) {
  return (
    <div style={{ marginLeft: depth * 20 }} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-surface)] p-3 shadow-sm">
        <div className="min-w-0 flex-1">
          {node.block_type === 'text' ? (
            <p className="truncate text-sm">{node.body_markdown}</p>
          ) : (
            <div className="flex items-center gap-2">
              {node.storage_path && photoUrls[node.storage_path] && (
                <img
                  src={photoUrls[node.storage_path]}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              <span className="truncate text-sm italic">
                {node.caption ?? '(bez popisu)'}
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1 text-sm">
          <button onClick={() => onMove(node, -1)} aria-label="Vyššie">
            ↑
          </button>
          <button onClick={() => onMove(node, 1)} aria-label="Nižšie">
            ↓
          </button>
          <button
            onClick={() => onRemove(node.id)}
            className="text-rose-600"
            aria-label="Zmazať"
          >
            ✕
          </button>
        </div>
      </div>
      {node.children.map((child) => (
        <BlockNode
          key={child.id}
          node={child}
          depth={depth + 1}
          photoUrls={photoUrls}
          onMove={onMove}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
