import type { PeriodInfo, PeriodPreset } from '../../types/account'

export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'
const ARGENTINA_UTC_OFFSET_HOURS = 3
const MAX_RANGE_DAYS = 366
const MIN_DATE = '2020-01-01'
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const PERIOD_PRESETS: PeriodPreset[] = [
  'today',
  '7d',
  '30d',
  'month',
  'last_month',
  'custom',
]

export type PeriodErrorCode =
  | 'invalid_preset'
  | 'invalid_date'
  | 'range_order'
  | 'range_too_long'
  | 'range_too_old'
  | 'range_missing'

export type PeriodResult = { ok: true; period: PeriodInfo } | { ok: false; error: PeriodErrorCode }

function parseDate(value: string) {
  const match = DATE_PATTERN.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const time = Date.UTC(year, month - 1, day)
  const date = new Date(time)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return time
}

function formatDate(time: number) {
  return new Date(time).toISOString().slice(0, 10)
}

export function isValidDate(value: string) {
  return parseDate(value) !== null
}

export function addDays(date: string, days: number) {
  const time = parseDate(date)
  if (time === null) throw new Error('invalid_date')
  return formatDate(time + days * 86_400_000)
}

export function daysBetween(from: string, to: string) {
  const start = parseDate(from)
  const end = parseDate(to)
  if (start === null || end === null) throw new Error('invalid_date')
  return Math.round((end - start) / 86_400_000) + 1
}

export function todayInArgentina(now: Date) {
  return formatDate(now.getTime() - ARGENTINA_UTC_OFFSET_HOURS * 3_600_000)
}

export function startOfArgentinaDay(date: string) {
  const time = parseDate(date)
  if (time === null) throw new Error('invalid_date')
  return new Date(time + ARGENTINA_UTC_OFFSET_HOURS * 3_600_000)
}

function firstOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`
}

function lastOfMonth(date: string) {
  const first = parseDate(firstOfMonth(date))!
  const next = new Date(first)
  next.setUTCMonth(next.getUTCMonth() + 1)
  return formatDate(next.getTime() - 86_400_000)
}

function previousMonthStart(date: string) {
  return firstOfMonth(addDays(firstOfMonth(date), -1))
}

function buildPeriod(
  preset: PeriodPreset,
  from: string,
  to: string,
  prevFrom: string,
  prevTo: string,
  today: string,
): PeriodInfo {
  return {
    preset,
    from,
    to,
    prevFrom,
    prevTo,
    days: daysBetween(from, to),
    startsAt: startOfArgentinaDay(from).toISOString(),
    endsAt: startOfArgentinaDay(addDays(to, 1)).toISOString(),
    prevStartsAt: startOfArgentinaDay(prevFrom).toISOString(),
    prevEndsAt: startOfArgentinaDay(addDays(prevTo, 1)).toISOString(),
    includesToday: to === today,
  }
}

function rollingPrevious(from: string, to: string) {
  const days = daysBetween(from, to)
  const prevTo = addDays(from, -1)
  return { prevFrom: addDays(prevTo, -(days - 1)), prevTo }
}

function monthPrevious(from: string, to: string) {
  const days = daysBetween(from, to)
  const prevFrom = previousMonthStart(from)
  const prevMonthEnd = lastOfMonth(prevFrom)
  const candidate = addDays(prevFrom, days - 1)
  return { prevFrom, prevTo: candidate > prevMonthEnd ? prevMonthEnd : candidate }
}

export interface PeriodInput {
  preset?: string | null
  from?: string | null
  to?: string | null
}

export function resolvePeriod(input: PeriodInput, now: Date): PeriodResult {
  const preset = (input.preset ?? '30d') as PeriodPreset
  if (!PERIOD_PRESETS.includes(preset)) return { ok: false, error: 'invalid_preset' }

  const today = todayInArgentina(now)

  if (preset === 'custom') {
    if (!input.from || !input.to) return { ok: false, error: 'range_missing' }
    if (!isValidDate(input.from) || !isValidDate(input.to)) {
      return { ok: false, error: 'invalid_date' }
    }
    const from = input.from
    const to = input.to > today ? today : input.to
    if (from > to) return { ok: false, error: 'range_order' }
    if (from < MIN_DATE) return { ok: false, error: 'range_too_old' }
    if (daysBetween(from, to) > MAX_RANGE_DAYS) return { ok: false, error: 'range_too_long' }
    const previous = rollingPrevious(from, to)
    return {
      ok: true,
      period: buildPeriod(preset, from, to, previous.prevFrom, previous.prevTo, today),
    }
  }

  let from: string
  let to: string = today

  if (preset === 'today') {
    from = today
  } else if (preset === '7d') {
    from = addDays(today, -6)
  } else if (preset === '30d') {
    from = addDays(today, -29)
  } else if (preset === 'month') {
    from = firstOfMonth(today)
  } else {
    const start = previousMonthStart(today)
    from = start
    to = lastOfMonth(start)
  }

  const previous =
    preset === 'month' || preset === 'last_month'
      ? monthPrevious(from, to)
      : rollingPrevious(from, to)

  return {
    ok: true,
    period: buildPeriod(preset, from, to, previous.prevFrom, previous.prevTo, today),
  }
}
