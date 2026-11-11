import type { DashboardData, PeriodInfo, RawDashboard } from '../../types/account'
import { buildChartPoints, chooseBucket, performanceByBranch, summarize } from './metrics'

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeRawDashboard(raw: RawDashboard): RawDashboard {
  return {
    branches: (raw.branches ?? []).map((branch) => ({
      id: branch.id,
      slug: branch.slug,
      name: branch.name,
      menuActive: Boolean(branch.menuActive),
      revenue: toNumber(branch.revenue),
      orders: toNumber(branch.orders),
      tips: toNumber(branch.tips),
      expenses: toNumber(branch.expenses),
      prevRevenue: toNumber(branch.prevRevenue),
      prevOrders: toNumber(branch.prevOrders),
      prevExpenses: toNumber(branch.prevExpenses),
    })),
    series: (raw.series ?? []).map((point) => ({
      date: point.date,
      revenue: toNumber(point.revenue),
      orders: toNumber(point.orders),
      expenses: toNumber(point.expenses),
    })),
    prevSeries: (raw.prevSeries ?? []).map((point) => ({
      date: point.date,
      revenue: toNumber(point.revenue),
      orders: toNumber(point.orders),
      expenses: toNumber(point.expenses),
    })),
  }
}

export function buildDashboard(
  rawInput: RawDashboard,
  period: PeriodInfo,
  generatedAt: Date,
): DashboardData {
  const raw = normalizeRawDashboard(rawInput)
  const bucket = chooseBucket(period.days)
  return {
    period,
    totals: summarize(raw.branches),
    branches: performanceByBranch(raw.branches),
    chart: { bucket, points: buildChartPoints(raw.series, raw.prevSeries, bucket) },
    generatedAt: generatedAt.toISOString(),
  }
}
