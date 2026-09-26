import type { ChapterBlock } from './types'

export interface BlockNode extends ChapterBlock {
  children: BlockNode[]
}

export function buildTree(blocks: ChapterBlock[]): BlockNode[] {
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

/**
 * Kroky hlavného listu kapitoly v poradí, v akom ich vydáva server
 * (order_index, pri zhode id — rovnako ako block_step_reachable()).
 */
export function stepsOf(blocks: ChapterBlock[]): BlockNode[] {
  return buildTree(blocks)
    .filter((node) => !node.parent_block_id && !node.map_pin_id)
    .sort(
      (a, b) => a.order_index - b.order_index || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
}
