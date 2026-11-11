const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatCashAmount(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
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
