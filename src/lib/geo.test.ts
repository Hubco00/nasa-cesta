import { describe, expect, it } from 'vitest'
import { checkLocation, distanceInMeters } from './geo'

describe('distanceInMeters', () => {
  it('vráti 0 pre identický bod', () => {
    const p = { latitude: 48.1486, longitude: 17.1077 }
    expect(distanceInMeters(p, p)).toBeCloseTo(0, 3)
  })

  it('vypočíta reálnu vzdialenosť medzi dvoma známymi bodmi (Bratislava - Viedeň, ~55.7 km)', () => {
    const bratislava = { latitude: 48.1486, longitude: 17.1077 }
    const vienna = { latitude: 48.2082, longitude: 16.3738 }
    const distance = distanceInMeters(bratislava, vienna)
    expect(distance).toBeGreaterThan(54_000)
    expect(distance).toBeLessThan(58_000)
  })

  it('je symetrická', () => {
    const a = { latitude: 10, longitude: 20 }
    const b = { latitude: 15, longitude: 25 }
    expect(distanceInMeters(a, b)).toBeCloseTo(distanceInMeters(b, a), 6)
  })
})

describe('checkLocation', () => {
  const target = { latitude: 48.1486, longitude: 17.1077 }

  it('vráti within_range, keď je hráčka presne na mieste', () => {
    const result = checkLocation(target, target, 50)
    expect(result.status).toBe('within_range')
  })

  it('vráti within_range v rámci povoleného rádiusu', () => {
    // ~30 m severne
    const nearby = { latitude: 48.1489, longitude: 17.1077 }
    const result = checkLocation(nearby, target, 50)
    expect(result.status).toBe('within_range')
  })

  it('vráti too_far mimo rádiusu aj s toleranciou', () => {
    // ~500 m severne
    const far = { latitude: 48.1531, longitude: 17.1077 }
    const result = checkLocation(far, target, 50, 10)
    expect(result.status).toBe('too_far')
  })

  it('GPS tolerancia (accuracy) pomôže tesne pri hranici rádiusu', () => {
    // ~60 m od cieľa, rádius 50 m, ale GPS presnosť 20 m by mala stačiť
    const edge = { latitude: 48.14914, longitude: 17.1077 }
    const result = checkLocation(edge, target, 50, 20)
    expect(result.status).toBe('within_range')
  })
})
