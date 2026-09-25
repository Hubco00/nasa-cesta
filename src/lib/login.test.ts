import { describe, expect, it } from 'vitest'
import { toLoginEmail } from './login'

describe('toLoginEmail', () => {
  it('doplní k menu interný e-mail', () => {
    expect(toLoginEmail('viki')).toBe('viki@nasa-cesta.local')
  })

  it('ignoruje medzery a veľké písmená', () => {
    expect(toLoginEmail('  Hubco ')).toBe('hubco@nasa-cesta.local')
  })

  it('plný e-mail nechá tak', () => {
    expect(toLoginEmail('niekto@gmail.com')).toBe('niekto@gmail.com')
  })
})
