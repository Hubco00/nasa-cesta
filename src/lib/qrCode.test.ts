import { describe, expect, it } from 'vitest'
import { randomQrToken } from './qrCode'

describe('randomQrToken', () => {
  it('vytvorí token v tvare quest_ + 16 hex znakov', () => {
    expect(randomQrToken()).toMatch(/^quest_[0-9a-f]{16}$/)
  })

  it('každý token je iný', () => {
    const tokens = new Set(Array.from({ length: 50 }, randomQrToken))
    expect(tokens.size).toBe(50)
  })
})
