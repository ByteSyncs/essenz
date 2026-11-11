import { describe, expect, it } from 'vitest'
import {
  cashDifference,
  formatCashAmount,
  formatCashDate,
  normalizeCashText,
  parseCashAmount,
  parseCashInput,
} from './cashRegister'

describe('cash register values', () => {
  it('formats Argentine pesos without losing cents', () => {
    expect(formatCashAmount(1234.5)).toContain('1.234,50')
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
