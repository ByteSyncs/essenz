import type { CashRegisterExpense, CashRegisterMovement } from '../types/cashRegister'

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const wholeCurrencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const timeFormatter = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dayFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
const dayYearFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatCashAmount(value: number) {
  const rounded = Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) / 100 : 0
  const normalized = Object.is(rounded, -0) ? 0 : rounded
  return Number.isInteger(normalized)
    ? wholeCurrencyFormatter.format(normalized)
    : currencyFormatter.format(normalized)
}

export function formatCashTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--:--' : timeFormatter.format(date)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatCashMoment(value: string, now: Date = new Date()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  const dayDifference = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  const time = timeFormatter.format(date)
  if (dayDifference === 0) return `Hoy, ${time}`
  if (dayDifference === 1) return `Ayer, ${time}`

  const day =
    date.getFullYear() === now.getFullYear()
      ? dayFormatter.format(date)
      : dayYearFormatter.format(date)
  return `${day}, ${time}`
}

export function formatCashDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : dateFormatter.format(date)
}

export function parseCashAmount(value: unknown, allowZero = true): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN

  if (
    !Number.isFinite(parsed) ||
    parsed < (allowZero ? 0 : Number.EPSILON) ||
    parsed > 100_000_000
  ) {
    return null
  }

  const rounded = Math.round((parsed + Number.EPSILON) * 100) / 100
  if (!allowZero && rounded === 0) return null
  return rounded
}

export function parseCashInput(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(/^\$/, '')
  if (!normalized) return null

  const decimalValue = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized
  const parsed = Number(decimalValue)

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000_000) return null
  return Math.round((parsed + Number.EPSILON) * 100) / 100
}

export function cashDifference(expected: number, counted: number) {
  return Math.round((counted - expected + Number.EPSILON) * 100) / 100
}

export function normalizeCashText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return undefined

  const normalized = value.trim()
  if (normalized.length > maxLength) return undefined
  return normalized || null
}

export interface CashFeedMovement {
  kind: 'movement'
  id: string
  at: string
  movement: CashRegisterMovement
}

export interface CashFeedExpense {
  kind: 'expense'
  id: string
  at: string
  expense: CashRegisterExpense
}

export type CashFeedEntry = CashFeedMovement | CashFeedExpense

export function buildCashFeed(
  movements: CashRegisterMovement[],
  expenses: CashRegisterExpense[],
): CashFeedEntry[] {
  const entries: CashFeedEntry[] = [
    ...movements.map((movement): CashFeedEntry => ({
      kind: 'movement',
      id: `m-${movement.id}`,
      at: movement.createdAt,
      movement,
    })),
    ...expenses.map((expense): CashFeedEntry => ({
      kind: 'expense',
      id: `e-${expense.id}`,
      at: expense.createdAt,
      expense,
    })),
  ]

  return entries.sort((a, b) => {
    const diff = new Date(b.at).getTime() - new Date(a.at).getTime()
    return Number.isNaN(diff) || diff === 0 ? a.id.localeCompare(b.id) : diff
  })
}

export function splitPaymentTotals(payments: { method: string; amount: number }[]) {
  let cash = 0
  let electronic = 0
  for (const payment of payments) {
    if (payment.method === 'cash') cash += payment.amount
    else electronic += payment.amount
  }
  return { cash, electronic }
}
