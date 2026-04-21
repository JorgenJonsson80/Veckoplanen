import { describe, it, expect } from 'vitest'
import { getISOWeek } from './date'

describe('getISOWeek', () => {
  it('returns correct week for a mid-year Monday', () => {
    expect(getISOWeek(new Date('2024-06-03'))).toBe('2024-v23')
  })

  it('returns correct week for a mid-year Sunday', () => {
    expect(getISOWeek(new Date('2024-06-09'))).toBe('2024-v23')
  })

  it('handles week 1 correctly (Jan 6 2025 is week 2)', () => {
    expect(getISOWeek(new Date('2025-01-01'))).toBe('2025-v1')
    expect(getISOWeek(new Date('2025-01-06'))).toBe('2025-v2')
  })

  it('handles year boundary where Dec 31 belongs to next year week 1', () => {
    // 2018-12-31 is ISO week 2019-v1
    expect(getISOWeek(new Date('2018-12-31'))).toBe('2019-v1')
  })

  it('handles year boundary where Jan 1 belongs to previous year last week', () => {
    // 2016-01-01 is ISO week 2015-v53
    expect(getISOWeek(new Date('2016-01-01'))).toBe('2015-v53')
  })

  it('week 52 in a normal year', () => {
    expect(getISOWeek(new Date('2024-12-23'))).toBe('2024-v52')
  })

  it('week 53 in a long year', () => {
    // 2020 has 53 ISO weeks
    expect(getISOWeek(new Date('2020-12-28'))).toBe('2020-v53')
  })
})
