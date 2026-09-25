import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('vytiahne text z Error', () => {
    expect(getErrorMessage(new Error('zlyhalo'))).toBe('zlyhalo')
  })

  it('vytiahne text z chyby Supabase (obyčajný objekt s message)', () => {
    expect(getErrorMessage({ message: 'duplicate key', code: '23505' })).toBe(
      'duplicate key',
    )
  })

  it('iné hodnoty prevedie na text', () => {
    expect(getErrorMessage('niečo')).toBe('niečo')
  })
})
