import { describe, expect, it } from 'vitest'
import type { AccountOverview, ActivityData, DashboardData } from '../../types/account'
import { buildAttention, groupAttentionByBranch, prioritizeAttention } from './attention'

function overview(
  branches: Partial<AccountOverview['branches'][number]>[],
  maxProducts: number | null = 1000,
): AccountOverview {
  return {
    business: { name: 'Negocio', ownerName: null, ownerEmail: null },
    plan: {
      id: 'business',
      name: 'Plan Business',
      status: 'active',
      currentPeriodEnd: null,
      maxBranches: 5,
      maxProductsPerBranch: maxProducts,
      billingPath: null,
    },
    branches: branches.map((partial, index) => ({
      id: `id-${index}`,
      slug: `s${index}`,
      name: `Sucursal ${index}`,
      isMain: index === 0,
      menuActive: true,
      hasContactInfo: true,
      productCount: 10,
      employeeCount: 0,
      ...partial,
    })),
  }
}

function dashboard(orders: Record<string, number>): DashboardData {
  const branches = Object.entries(orders).map(([slug, count]) => ({
    slug,
    orders: count,
  })) as unknown as DashboardData['branches']
  const total = Object.values(orders).reduce((sum, value) => sum + value, 0)
  return { totals: { orders: total }, branches } as unknown as DashboardData
}

const emptyActivity: ActivityData = {
  recentOrders: [],
  lastOrderAt: [],
  lowStock: { total: 0, byBranch: [], items: [] },
}

describe('buildAttention', () => {
  it('returns nothing without an overview', () => {
    expect(buildAttention(null, null, null)).toEqual([])
  })

  it('reports an inactive public menu', () => {
    const items = buildAttention(overview([{ menuActive: false }]), emptyActivity, null)
    expect(items.map((item) => item.kind)).toEqual(['menu_inactive'])
    expect(items[0].actionHref).toBe('/s0/admin/dashboard?view=settings')
  })

  it('reports low stock with the right plural', () => {
    const activity: ActivityData = {
      ...emptyActivity,
      lowStock: {
        total: 3,
        byBranch: [
          { branchSlug: 's0', items: 1 },
          { branchSlug: 's1', items: 2 },
        ],
        items: [],
      },
    }
    const items = buildAttention(overview([{}, {}]), activity, null)
    expect(items.map((item) => item.message)).toEqual([
      '1 insumo está en el stock mínimo o por debajo.',
      '2 insumos están en el stock mínimo o por debajo.',
    ])
  })

  it('warns when a branch is close to the product limit', () => {
    const items = buildAttention(overview([{ productCount: 95 }], 100), emptyActivity, null)
    expect(items.map((item) => item.kind)).toEqual(['product_limit'])
  })

  it('does not warn about limits on plans without one', () => {
    expect(buildAttention(overview([{ productCount: 5000 }], null), emptyActivity, null)).toEqual(
      [],
    )
  })

  it('flags branches without orders only when the account has sales', () => {
    const base = overview([{}, {}])
    expect(buildAttention(base, emptyActivity, dashboard({ s0: 0, s1: 0 }))).toEqual([])
    const items = buildAttention(base, emptyActivity, dashboard({ s0: 4, s1: 0 }))
    expect(items.map((item) => item.id)).toEqual(['s1:no_orders'])
  })

  it('flags missing contact information', () => {
    const items = buildAttention(overview([{ hasContactInfo: false }]), emptyActivity, null)
    expect(items.map((item) => item.kind)).toEqual(['no_contact'])
  })

  it('stays empty for a healthy account', () => {
    expect(buildAttention(overview([{}]), emptyActivity, dashboard({ s0: 3 }))).toEqual([])
  })
})

describe('no_orders alert', () => {
  it('points the owner to statistics, since owners have no orders panel', () => {
    const items = buildAttention(
      overview([{}, {}]),
      emptyActivity,
      dashboard({ s0: 5, s1: 0 }),
      'en los últimos 30 días',
    )
    expect(items).toHaveLength(1)
    expect(items[0].actionHref).toBe('/s1/admin/dashboard?view=statistics')
    expect(items[0].message).toBe('No registró pedidos en los últimos 30 días.')
  })
})

describe('prioritizeAttention', () => {
  it('puts the public-facing problems first and keeps order within a kind', () => {
    const items = buildAttention(
      overview([{ hasContactInfo: false }, { menuActive: false }, { hasContactInfo: false }]),
      emptyActivity,
      null,
    )
    expect(prioritizeAttention(items).map((item) => item.id)).toEqual([
      's1:menu_inactive',
      's0:no_contact',
      's2:no_contact',
    ])
  })
})

describe('groupAttentionByBranch', () => {
  it('groups by branch, most alerts first, and lists clean branches apart', () => {
    const base = overview([
      {},
      { menuActive: false, hasContactInfo: false },
      { hasContactInfo: false },
      {},
    ])
    const items = buildAttention(base, emptyActivity, null)
    const { withItems, clean } = groupAttentionByBranch(base.branches, items)
    expect(withItems.map((entry) => [entry.branchSlug, entry.items.length])).toEqual([
      ['s1', 2],
      ['s2', 1],
    ])
    expect(clean.map((entry) => entry.branchSlug)).toEqual(['s0', 's3'])
  })

  it('returns everything clean when there are no alerts', () => {
    const base = overview([{}, {}])
    const { withItems, clean } = groupAttentionByBranch(base.branches, [])
    expect(withItems).toEqual([])
    expect(clean).toHaveLength(2)
  })
})
