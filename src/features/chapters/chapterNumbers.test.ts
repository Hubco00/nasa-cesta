import { describe, expect, it } from 'vitest'
import { chapterNumbers, TUTORIAL_MARK } from './chapterNumbers'

describe('chapterNumbers', () => {
  it('tutoriál sa nečísluje, ostatné kapitoly idú od 1', () => {
    const numbers = chapterNumbers([
      { key: 't', isTutorial: true },
      { key: 'a', isTutorial: false },
      { key: 'b', isTutorial: false },
    ])
    expect([...numbers.entries()]).toEqual([
      ['t', TUTORIAL_MARK],
      ['a', '1'],
      ['b', '2'],
    ])
  })
})
