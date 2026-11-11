import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  resolvePeriod,
  startOfArgentinaDay,
  todayInArgentina,
} from './period'

const NOW = new Date('2026-10-21T18:19:00Z')

function resolve(input: Parameters<typeof resolvePeriod>[0], now = NOW) {
  const result = resolvePeriod(input, now)
  if (!result.ok) throw new Error(result.error)
  return result.period
}

describe('todayInArgentina', () => {
  it('uses the Argentine calendar day', () => {
    expect(todayInArgentina(new Date('2026-10-21T02:59:59Z'))).toBe('2026-10-20')
    expect(todayInArgentina(new Date('2026-10-21T03:00:00Z'))).toBe('2026-10-21')
  })

  it('crosses month and year boundaries', () => {
    expect(todayInArgentina(new Date('2026-01-01T02:00:00Z'))).toBe('2025-12-31')
    expect(todayInArgentina(new Date('2026-03-01T01:00:00Z'))).toBe('2026-02-28')
  })
})

describe('date helpers', () => {
  it('adds days across months and leap years', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('counts days inclusively', () => {
    expect(daysBetween('2026-10-01', '2026-10-01')).toBe(1)
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(31)
  })

  it('maps an Argentine midnight to 03:00 UTC', () => {
    expect(startOfArgentinaDay('2026-10-21').toISOString()).toBe('2026-10-21T03:00:00.000Z')
  })
})

describe('resolvePeriod presets', () => {
  it('resolves today against the previous day', () => {
    const period = resolve({ preset: 'today' })
    expect(period.from).toBe('2026-10-21')
    expect(period.to).toBe('2026-10-21')
    expect(period.prevFrom).toBe('2026-10-20')
    expect(period.prevTo).toBe('2026-10-20')
    expect(period.days).toBe(1)
    expect(period.includesToday).toBe(true)
  })

  it('resolves seven calendar days including today', () => {
    const period = resolve({ preset: '7d' })
    expect(period.from).toBe('2026-10-15')
    expect(period.to).toBe('2026-10-21')
    expect(period.days).toBe(7)
    expect(period.prevFrom).toBe('2026-10-08')
    expect(period.prevTo).toBe('2026-10-14')
  })

  it('resolves thirty calendar days including today', () => {
    const period = resolve({ preset: '30d' })
    expect(period.days).toBe(30)
    expect(period.from).toBe('2026-09-22')
    expect(period.prevTo).toBe('2026-09-21')
    expect(period.prevFrom).toBe('2026-08-23')
  })

  it('defaults to thirty days', () => {
    expect(resolve({}).preset).toBe('30d')
  })

  it('compares the current month with the same elapsed days of the previous month', () => {
    const period = resolve({ preset: 'month' })
    expect(period.from).toBe('2026-10-01')
    expect(period.to).toBe('2026-10-21')
    expect(period.prevFrom).toBe('2026-09-01')
    expect(period.prevTo).toBe('2026-09-21')
  })

  it('clamps the previous period to the end of a shorter month', () => {
    const period = resolve({ preset: 'month' }, new Date('2026-03-31T15:00:00Z'))
    expect(period.from).toBe('2026-03-01')
    expect(period.to).toBe('2026-03-31')
    expect(period.prevFrom).toBe('2026-02-01')
    expect(period.prevTo).toBe('2026-02-28')
  })

  it('resolves the full previous month', () => {
    const period = resolve({ preset: 'last_month' })
    expect(period.from).toBe('2026-09-01')
    expect(period.to).toBe('2026-09-30')
    expect(period.days).toBe(30)
    expect(period.prevFrom).toBe('2026-08-01')
    expect(period.prevTo).toBe('2026-08-30')
    expect(period.includesToday).toBe(false)
  })

  it('resolves the previous month across a year boundary', () => {
    const period = resolve({ preset: 'last_month' }, new Date('2026-01-10T15:00:00Z'))
    expect(period.from).toBe('2025-12-01')
    expect(period.to).toBe('2025-12-31')
    expect(period.prevFrom).toBe('2025-11-01')
    expect(period.prevTo).toBe('2025-11-30')
  })

  it('builds exclusive UTC instants aligned with Argentine midnight', () => {
    const period = resolve({ preset: 'today' })
    expect(period.startsAt).toBe('2026-10-21T03:00:00.000Z')
    expect(period.endsAt).toBe('2026-10-22T03:00:00.000Z')
    expect(period.prevStartsAt).toBe('2026-10-20T03:00:00.000Z')
    expect(period.prevEndsAt).toBe('2026-10-21T03:00:00.000Z')
  })

  it('keeps the previous window contiguous with the current one', () => {
    for (const preset of ['today', '7d', '30d']) {
      const period = resolve({ preset })
      expect(period.prevEndsAt).toBe(period.startsAt)
    }
  })
})

describe('resolvePeriod custom ranges', () => {
  it('accepts a valid range and compares with the preceding window', () => {
    const period = resolve({ preset: 'custom', from: '2026-10-01', to: '2026-10-10' })
    expect(period.days).toBe(10)
    expect(period.prevFrom).toBe('2026-09-21')
    expect(period.prevTo).toBe('2026-09-30')
  })

  it('clamps an end date in the future to today', () => {
    const period = resolve({ preset: 'custom', from: '2026-10-15', to: '2026-12-31' })
    expect(period.to).toBe('2026-10-21')
    expect(period.includesToday).toBe(true)
  })

  it('rejects malformed or impossible dates', () => {
    expect(resolvePeriod({ preset: 'custom', from: '2026-02-30', to: '2026-03-01' }, NOW)).toEqual({
      ok: false,
      error: 'invalid_date',
    })
    expect(resolvePeriod({ preset: 'custom', from: 'ayer', to: '2026-03-01' }, NOW)).toEqual({
      ok: false,
      error: 'invalid_date',
    })
  })

  it('rejects missing, reversed, oversized and ancient ranges', () => {
    expect(resolvePeriod({ preset: 'custom', from: '2026-10-01' }, NOW)).toEqual({
      ok: false,
      error: 'range_missing',
    })
    expect(resolvePeriod({ preset: 'custom', from: '2026-10-10', to: '2026-10-01' }, NOW)).toEqual({
      ok: false,
      error: 'range_order',
    })
    expect(resolvePeriod({ preset: 'custom', from: '2025-01-01', to: '2026-10-01' }, NOW)).toEqual({
      ok: false,
      error: 'range_too_long',
    })
    expect(resolvePeriod({ preset: 'custom', from: '2019-12-31', to: '2020-01-05' }, NOW)).toEqual({
      ok: false,
      error: 'range_too_old',
    })
  })

  it('rejects unknown presets', () => {
    expect(resolvePeriod({ preset: 'forever' }, NOW)).toEqual({
      ok: false,
      error: 'invalid_preset',
    })
  })
})
