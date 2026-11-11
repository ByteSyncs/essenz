import type { DeltaInfo } from '../../types/account'
import { ARGENTINA_TIME_ZONE } from './period'

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const currencyWithCents = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integer = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})

const compact = new Intl.NumberFormat('es-AR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const shortDate = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

const longDate = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const weekdayDate = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

const timeOfDay = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: ARGENTINA_TIME_ZONE,
})

const dayAndTime = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: ARGENTINA_TIME_ZONE,
})

function clean(value: string) {
  return value.replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

export function formatMoney(value: number) {
  return currency.format(value)
}

export function formatMoneyPrecise(value: number) {
  return currencyWithCents.format(value)
}

export function formatCompactMoney(value: number) {
  return `$${clean(compact.format(value))}`
}

export function formatInteger(value: number) {
  return integer.format(value)
}

export function formatShortDate(date: string) {
  return clean(shortDate.format(new Date(`${date}T00:00:00Z`)))
}

export function formatLongDate(date: string) {
  return longDate.format(new Date(`${date}T00:00:00Z`))
}

export function formatWeekdayDate(date: string) {
  return clean(weekdayDate.format(new Date(`${date}T00:00:00Z`)))
}

export function formatDateRange(from: string, to: string) {
  if (from === to) return formatShortDate(from)
  return `${formatShortDate(from)} – ${formatShortDate(to)}`
}

export function formatTime(iso: string) {
  return timeOfDay.format(new Date(iso))
}

export function formatDayAndTime(iso: string) {
  return clean(dayAndTime.format(new Date(iso)))
}

export function formatPercent(value: number | null) {
  if (value === null) return '—'
  return `${decimal.format(value)} %`
}

export function formatSignedPercent(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${decimal.format(Math.abs(value))} %`
}

export function describeDelta(delta: DeltaInfo) {
  switch (delta.kind) {
    case 'up':
      return `Subió ${decimal.format(Math.abs(delta.pct ?? 0))} %`
    case 'down':
      return `Bajó ${decimal.format(Math.abs(delta.pct ?? 0))} %`
    case 'flat':
      return 'Sin cambios'
    case 'new':
      return 'Sin datos en el período anterior'
    default:
      return 'Sin datos para comparar'
  }
}

export function formatRelativeTime(iso: string | null, now: Date = new Date()) {
  if (!iso) return 'Sin pedidos'
  const diff = now.getTime() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Hace instantes'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`
  return formatDayAndTime(iso)
}
