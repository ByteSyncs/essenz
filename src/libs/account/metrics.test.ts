import { describe, expect, it } from 'vitest'
import type { RawBranchRow, RawDashboard, RawSeriesPoint } from '../../types/account'
import { buildDashboard } from './dashboard'
import {
  averageTicket,
  buildChartPoints,
  calculateDelta,
  chooseBucket,
  performanceByBranch,
  shareOf,
  sortBranches,
  summarize,
} from './metrics'
import { resolvePeriod } from './period'

function branch(overrides: Partial<RawBranchRow>): RawBranchRow {
  return {
    id: overrides.slug ?? 'id',
    slug: 'sucursal',
    name: 'Sucursal',
    menuActive: true,
    revenue: 0,
    orders: 0,
    tips: 0,
    expenses: 0,
    prevRevenue: 0,
    prevOrders: 0,
    prevExpenses: 0,
    ...overrides,
  }
}

function day(date: string, revenue: number, orders = 1, expenses = 0): RawSeriesPoint {
  return { date, revenue, orders, expenses }
}

describe('calculateDelta', () => {
  it('computes growth and decline with one decimal', () => {
    expect(calculateDelta(150, 100)).toEqual({ kind: 'up', pct: 50 })
    expect(calculateDelta(80, 100)).toEqual({ kind: 'down', pct: -20 })
    expect(calculateDelta(1003, 1000)).toEqual({ kind: 'up', pct: 0.3 })
  })

  it('never divides by zero', () => {
    expect(calculateDelta(100, 0)).toEqual({ kind: 'new', pct: null })
    expect(calculateDelta(0, 0)).toEqual({ kind: 'none', pct: null })
    expect(calculateDelta(0, 100)).toEqual({ kind: 'down', pct: -100 })
  })

  it('reports negligible changes as flat', () => {
    expect(calculateDelta(100000, 100001).kind).toBe('flat')
  })

  it('uses the absolute base for negative previous values', () => {
    expect(calculateDelta(-50, -100)).toEqual({ kind: 'up', pct: 50 })
  })
})

describe('ticket and share', () => {
  it('has no average ticket without orders', () => {
    expect(averageTicket(1000, 0)).toBeNull()
    expect(averageTicket(1000, 3)).toBe(333.33)
  })

  it('has no share when the total is zero', () => {
    expect(shareOf(0, 0)).toBeNull()
    expect(shareOf(250, 1000)).toBe(25)
  })
})

describe('summarize', () => {
  const branches = [
    branch({
      slug: 'a',
      revenue: 1500,
      orders: 2,
      tips: 100,
      expenses: 300,
      prevRevenue: 400,
      prevOrders: 1,
      prevExpenses: 100,
    }),
    branch({ slug: 'b', revenue: 2000, orders: 1, expenses: 50 }),
    branch({ slug: 'c' }),
  ]

  it('sums every branch without duplicating amounts', () => {
    const totals = summarize(branches)
    expect(totals.revenue).toBe(3500)
    expect(totals.orders).toBe(3)
    expect(totals.tips).toBe(100)
    expect(totals.expenses).toBe(350)
    expect(totals.result).toBe(3150)
    expect(totals.avgTicket).toBe(1166.67)
    expect(totals.prevRevenue).toBe(400)
    expect(totals.prevResult).toBe(300)
  })

  it('compares against the previous period', () => {
    const totals = summarize(branches)
    expect(totals.revenueDelta).toEqual({ kind: 'up', pct: 775 })
    expect(totals.expensesDelta).toEqual({ kind: 'up', pct: 250 })
  })

  it('handles an account with no activity', () => {
    const totals = summarize([branch({ slug: 'a' })])
    expect(totals.revenue).toBe(0)
    expect(totals.avgTicket).toBeNull()
    expect(totals.revenueDelta.kind).toBe('none')
    expect(totals.avgTicketDelta.kind).toBe('none')
  })

  it('handles an account without branches', () => {
    expect(summarize([]).revenue).toBe(0)
  })
})

describe('performanceByBranch', () => {
  it('keeps branches without activity and avoids misleading percentages', () => {
    const rows = performanceByBranch([branch({ slug: 'a' }), branch({ slug: 'b' })])
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.share === null)).toBe(true)
  })

  it('shares add up to the whole', () => {
    const rows = performanceByBranch([
      branch({ slug: 'a', revenue: 750 }),
      branch({ slug: 'b', revenue: 250 }),
    ])
    expect(rows.map((row) => row.share)).toEqual([75, 25])
  })
})

describe('sortBranches', () => {
  const rows = performanceByBranch([
    branch({ slug: 'a', name: 'Alta', revenue: 100, orders: 5 }),
    branch({ slug: 'b', name: 'Baja', revenue: 300, orders: 1 }),
    branch({ slug: 'c', name: 'Cero' }),
  ])

  it('sorts by revenue descending', () => {
    expect(sortBranches(rows, 'revenue', 'desc').map((row) => row.slug)).toEqual(['b', 'a', 'c'])
  })

  it('sorts by orders ascending', () => {
    expect(sortBranches(rows, 'orders', 'asc').map((row) => row.slug)).toEqual(['c', 'b', 'a'])
  })

  it('places branches without a ticket last in both directions', () => {
    expect(sortBranches(rows, 'avgTicket', 'desc').at(-1)?.slug).toBe('c')
    expect(sortBranches(rows, 'avgTicket', 'asc').at(-1)?.slug).toBe('c')
  })

  it('sorts by name', () => {
    expect(sortBranches(rows, 'name', 'desc').map((row) => row.slug)).toEqual(['c', 'b', 'a'])
  })
})

describe('chart series', () => {
  it('uses daily buckets up to 62 days and weekly beyond', () => {
    expect(chooseBucket(62)).toBe('day')
    expect(chooseBucket(63)).toBe('week')
  })

  it('aligns the previous period by position', () => {
    const points = buildChartPoints(
      [day('2026-10-02', 100), day('2026-10-03', 200)],
      [day('2026-09-02', 50), day('2026-09-03', 80)],
      'day',
    )
    expect(points.map((p) => p.prevRevenue)).toEqual([50, 80])
    expect(points[1].prevDate).toBe('2026-09-03')
  })

  it('leaves the comparison empty when the previous series is shorter', () => {
    const points = buildChartPoints(
      [day('2026-10-02', 100), day('2026-10-03', 200)],
      [day('2026-09-02', 50)],
      'day',
    )
    expect(points[1].prevRevenue).toBeNull()
  })

  it('groups weeks starting on Monday and preserves totals', () => {
    const series = [
      day('2026-10-04', 10),
      day('2026-10-05', 20),
      day('2026-10-06', 30),
      day('2026-10-11', 40),
      day('2026-10-12', 50),
    ]
    const points = buildChartPoints(series, [], 'week')
    expect(points.map((p) => p.date)).toEqual(['2026-10-04', '2026-10-05', '2026-10-12'])
    expect(points.map((p) => p.revenue)).toEqual([10, 90, 50])
    expect(points.reduce((sum, p) => sum + p.revenue, 0)).toBe(150)
  })
})

describe('buildDashboard', () => {
  it('keeps totals, branches and chart consistent', () => {
    const periodResult = resolvePeriod({ preset: '7d' }, new Date('2026-10-21T18:00:00Z'))
    if (!periodResult.ok) throw new Error('period')
    const raw: RawDashboard = {
      branches: [
        branch({ slug: 'a', revenue: 600, orders: 3 }),
        branch({ slug: 'b', revenue: 400, orders: 2 }),
      ],
      series: Array.from({ length: 7 }, (_, index) =>
        day(`2026-10-${15 + index}`, index === 0 ? 1000 : 0, index === 0 ? 5 : 0),
      ),
      prevSeries: [],
    }
    const data = buildDashboard(raw, periodResult.period, new Date('2026-10-21T18:00:00Z'))
    const chartTotal = data.chart.points.reduce((sum, point) => sum + point.revenue, 0)
    expect(data.totals.revenue).toBe(1000)
    expect(chartTotal).toBe(data.totals.revenue)
    expect(data.branches.reduce((sum, b) => sum + (b.share ?? 0), 0)).toBe(100)
    expect(data.chart.bucket).toBe('day')
  })

  it('accepts numeric strings coming from the database', () => {
    const periodResult = resolvePeriod({ preset: 'today' }, new Date('2026-10-21T18:00:00Z'))
    if (!periodResult.ok) throw new Error('period')
    const raw = {
      branches: [{ ...branch({ slug: 'a' }), revenue: '1250.50', orders: '2' }],
      series: [],
      prevSeries: [],
    } as unknown as RawDashboard
    const data = buildDashboard(raw, periodResult.period, new Date())
    expect(data.totals.revenue).toBe(1250.5)
    expect(data.totals.orders).toBe(2)
  })
})
