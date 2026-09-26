import { describe, expect, it } from 'vitest'
import { stepsOf } from './blockTree'
import type { ChapterBlock } from './types'

function block(id: string, order: number, parent: string | null = null): ChapterBlock {
  return {
    id,
    chapter_id: 'c',
    parent_block_id: parent,
    map_pin_id: null,
    block_type: 'text',
    order_index: order,
  } as ChapterBlock
}

describe('stepsOf', () => {
  it('kroky sú iba bloky najvyššej úrovne, zoradené podľa poradia a pri zhode podľa id', () => {
    const steps = stepsOf([
      block('b', 20),
      block('photo', 10, 'a'),
      block('a', 10),
      block('c', 20),
      block('0', 20),
    ])
    expect(steps.map((s) => s.id)).toEqual(['a', '0', 'b', 'c'])
    expect(steps[0].children.map((c) => c.id)).toEqual(['photo'])
  })
})
