import type {
  BranchPerformance,
  ChartBucket,
  ChartPoint,
  DeltaInfo,
  RawBranchRow,
  RawSeriesPoint,
  Totals,
} from '../../types/account'
import { addDays } from './period'

export const WEEKLY_BUCKET_THRESHOLD_DAYS = 62

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateDelta(current: number, previous: number): DeltaInfo {
  if (previous === 0 && current === 0) return { kind: 'none', pct: null }
  if (previous === 0) return { kind: 'new', pct: null }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const rounded = Math.round(pct * 10) / 10
  if (Math.abs(rounded) < 0.1) return { kind: 'flat', pct: 0 }
  return { kind: rounded > 0 ? 'up' : 'down', pct: rounded }
}

export function averageTicket(revenue: number, orders: number) {
  if (orders <= 0) return null
  return roundMoney(revenue / orders)
}

export function shareOf(part: number, total: number) {
  if (total <= 0) return null
  return Math.round((part / total) * 1000) / 10
}

export function summarize(branches: RawBranchRow[]): Totals {
  const sum = (pick: (branch: RawBranchRow) => number) =>
    roundMoney(branches.reduce((total, branch) => total + pick(branch), 0))

  const revenue = sum((b) => b.revenue)
  const orders = branches.reduce((total, b) => total + b.orders, 0)
  const tips = sum((b) => b.tips)
  const expenses = sum((b) => b.expenses)
  const prevRevenue = sum((b) => b.prevRevenue)
  const prevOrders = branches.reduce((total, b) => total + b.prevOrders, 0)
  const prevExpenses = sum((b) => b.prevExpenses)
  const result = roundMoney(revenue - expenses)
  const prevResult = roundMoney(prevRevenue - prevExpenses)
  const ticket = averageTicket(revenue, orders)
  const prevTicket = averageTicket(prevRevenue, prevOrders)

  return {
    revenue,
    orders,
    tips,
    expenses,
    result,
    avgTicket: ticket,
    prevRevenue,
    prevOrders,
    prevExpenses,
    prevResult,
    prevAvgTicket: prevTicket,
    revenueDelta: calculateDelta(revenue, prevRevenue),
    ordersDelta: calculateDelta(orders, prevOrders),
    avgTicketDelta:
      ticket === null || prevTicket === null
        ? { kind: 'none', pct: null }
        : calculateDelta(ticket, prevTicket),
    expensesDelta: calculateDelta(expenses, prevExpenses),
    resultDelta: calculateDelta(result, prevResult),
  }
}

export function performanceByBranch(branches: RawBranchRow[]): BranchPerformance[] {
  const totalRevenue = roundMoney(branches.reduce((total, b) => total + b.revenue, 0))
  return branches.map((branch) => ({
    ...branch,
    revenue: roundMoney(branch.revenue),
    expenses: roundMoney(branch.expenses),
    tips: roundMoney(branch.tips),
    avgTicket: averageTicket(branch.revenue, branch.orders),
    result: roundMoney(branch.revenue - branch.expenses),
    share: shareOf(branch.revenue, totalRevenue),
    revenueDelta: calculateDelta(branch.revenue, branch.prevRevenue),
    ordersDelta: calculateDelta(branch.orders, branch.prevOrders),
  }))
}

export type BranchSortKey =
  | 'name'
  | 'revenue'
  | 'orders'
  | 'avgTicket'
  | 'expenses'
  | 'result'
  | 'share'

export function sortBranches(
  branches: BranchPerformance[],
  key: BranchSortKey,
  direction: 'asc' | 'desc',
) {
  const factor = direction === 'asc' ? 1 : -1
  return [...branches].sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name, 'es') * factor
    const left = a[key]
    const right = b[key]
    if (left === null && right === null) return a.name.localeCompare(b.name, 'es')
    if (left === null) return 1
    if (right === null) return -1
    if (left === right) return a.name.localeCompare(b.name, 'es')
    return (left - right) * factor
  })
}

export function chooseBucket(days: number): ChartBucket {
  return days > WEEKLY_BUCKET_THRESHOLD_DAYS ? 'week' : 'day'
}

function weekStart(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  return addDays(date, -offset)
}

interface Group {
  start: string
  end: string
  revenue: number
  orders: number
  expenses: number
}

function groupSeries(series: RawSeriesPoint[], bucket: ChartBucket): Group[] {
  if (bucket === 'day') {
    return series.map((point) => ({ start: point.date, end: point.date, ...pickValues(point) }))
  }
  const groups = new Map<string, Group>()
  for (const point of series) {
    const key = weekStart(point.date)
    const existing = groups.get(key)
    if (existing) {
      existing.end = point.date
      existing.revenue += point.revenue
      existing.orders += point.orders
      existing.expenses += point.expenses
    } else {
      groups.set(key, { start: point.date, end: point.date, ...pickValues(point) })
    }
  }
  return [...groups.values()]
}

function pickValues(point: RawSeriesPoint) {
  return { revenue: point.revenue, orders: point.orders, expenses: point.expenses }
}

export function buildChartPoints(
  series: RawSeriesPoint[],
  prevSeries: RawSeriesPoint[],
  bucket: ChartBucket,
): ChartPoint[] {
  const current = groupSeries(series, bucket)
  const previous = groupSeries(prevSeries, bucket)
  return current.map((group, index) => {
    const prev = previous[index]
    return {
      date: group.start,
      endDate: group.end,
      revenue: roundMoney(group.revenue),
      orders: group.orders,
      expenses: roundMoney(group.expenses),
      prevDate: prev ? prev.start : null,
      prevRevenue: prev ? roundMoney(prev.revenue) : null,
    }
  })
}
