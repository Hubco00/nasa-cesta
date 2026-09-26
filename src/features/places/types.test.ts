import { describe, expect, it } from 'vitest'
import { formatDistance } from './types'

describe('formatDistance', () => {
  it('pod kilometer v metroch', () => {
    expect(formatDistance(350)).toBe('350 m')
  })

  it('do 10 km s jedným desatinným miestom a čiarkou', () => {
    expect(formatDistance(2400)).toBe('2,4 km')
    expect(formatDistance(1000)).toBe('1,0 km')
  })

  it('nad 10 km zaokrúhlene', () => {
    expect(formatDistance(120_000)).toBe('120 km')
  })
})
