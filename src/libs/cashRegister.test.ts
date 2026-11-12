import { describe, expect, it } from 'vitest'
import {
  buildCashFeed,
  cashDifference,
  formatCashAmount,
  formatCashMoment,
  splitPaymentTotals,
  formatCashDate,
  normalizeCashText,
  parseCashAmount,
  parseCashInput,
} from './cashRegister'

describe('cash register values', () => {
  it('formats Argentine pesos without losing cents', () => {
    expect(formatCashAmount(1234.5)).toContain('1.234,50')
  })

  it('omits empty cents on whole amounts and never shows a negative zero', () => {
    expect(formatCashAmount(143900)).toMatch(/143\.900$/)
    expect(formatCashAmount(143900)).not.toContain(',')
    expect(formatCashAmount(-0.001)).toMatch(/0$/)
    expect(formatCashAmount(-0.001)).not.toContain('-')
    expect(formatCashAmount(Number.NaN)).toMatch(/0$/)
  })

  it('describes moments relative to today', () => {
    const now = new Date(2026, 10, 11, 20, 0)
    expect(formatCashMoment(new Date(2026, 10, 11, 16, 38).toISOString(), now)).toBe('Hoy, 16:38')
    expect(formatCashMoment(new Date(2026, 10, 10, 9, 5).toISOString(), now)).toBe('Ayer, 09:05')
    expect(formatCashMoment(new Date(2026, 9, 25, 16, 22).toISOString(), now)).toContain('16:22')
    expect(formatCashMoment(new Date(2025, 11, 31, 23, 59).toISOString(), now)).toContain('2025')
    expect(formatCashMoment('basura', now)).toBe('Fecha no disponible')
  })

  it('merges movements and cash expenses into one newest-first feed', () => {
    const feed = buildCashFeed(
      [
        {
          id: 'a',
          type: 'cash_in',
          amount: 10,
          description: 'Cambio',
          note: null,
          createdAt: '2026-11-11T10:00:00Z',
          createdByName: null,
          voidedAt: null,
        },
        {
          id: 'b',
          type: 'cash_out',
          amount: 5,
          description: 'Hielo',
          note: null,
          createdAt: '2026-11-11T12:00:00Z',
          createdByName: null,
          voidedAt: null,
        },
      ],
      [
        {
          id: 'x',
          description: 'Leche',
          amount: 7,
          category: 'supplies',
          createdAt: '2026-11-11T11:00:00Z',
        },
      ],
    )
    expect(feed.map((entry) => entry.id)).toEqual(['m-b', 'e-x', 'm-a'])
    expect(buildCashFeed([], [])).toEqual([])
  })

  it('splits physical cash from electronic payments in money, not percentages', () => {
    expect(
      splitPaymentTotals([
        { method: 'cash', amount: 100 },
        { method: 'debit', amount: 50 },
        { method: 'mercadopago', amount: 25 },
      ]),
    ).toEqual({ cash: 100, electronic: 75 })
    expect(splitPaymentTotals([])).toEqual({ cash: 0, electronic: 0 })
  })

  it('uses the physical counted amount to calculate a signed difference', () => {
    expect(cashDifference(200_000, 195_000)).toBe(-5000)
    expect(cashDifference(200_000, 205_000)).toBe(5000)
  })

  it('rejects invalid and out-of-range cash amounts', () => {
    expect(parseCashAmount('')).toBeNull()
    expect(parseCashAmount(-1)).toBeNull()
    expect(parseCashAmount(Number.NaN)).toBeNull()
    expect(parseCashAmount(100_000_001)).toBeNull()
    expect(parseCashAmount('0', false)).toBeNull()
    expect(parseCashAmount(0.001, false)).toBeNull()
    expect(parseCashAmount('12.345')).toBe(12.35)
  })

  it('accepts Argentine decimal and thousands separators from cash inputs', () => {
    expect(parseCashInput('1.234,50')).toBe(1234.5)
    expect(parseCashInput('1234,50')).toBe(1234.5)
    expect(parseCashInput('1234.50')).toBe(1234.5)
    expect(parseCashInput('-1')).toBeNull()
  })

  it('normalizes optional names and notes without silently accepting invalid values', () => {
    expect(normalizeCashText('  Jo  ', 80)).toBe('Jo')
    expect(normalizeCashText('  ', 80)).toBeNull()
    expect(normalizeCashText('x'.repeat(81), 80)).toBeUndefined()
    expect(normalizeCashText(12, 80)).toBeUndefined()
  })

  it('provides a safe label for an invalid timestamp', () => {
    expect(formatCashDate('invalid')).toBe('Fecha no disponible')
  })
})
