import { describe, expect, it } from 'vitest'
import { calculateLease } from '../utils/helpers'
import { tractors } from '../data/tractors'

describe('ATADAN catalogue data', () => {
  it('contains all commercial models', () => {
    expect(tractors).toHaveLength(7)
    expect(tractors.find(x => x.slug === 'changfa-cfj220')?.price).toBe(6850000)
  })
  it('calculates a positive leasing payment', () => {
    const result = calculateLease({price:6850000, downPercent:10, annualRate:6, months:84})
    expect(result.down).toBe(685000)
    expect(result.payment).toBeGreaterThan(80000)
  })
})
