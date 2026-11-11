import { describe, expect, it } from 'vitest'
import type { BranchOrders, RecentOrder } from '../../types/account'
import {
  ORDERS_DEFAULT_LIMIT,
  ORDERS_MAX_LIMIT,
  mapOrderRow,
  parseOrdersLimit,
  splitBranchesByActivity,
} from './orders'

const branch = { slug: 'centro', name: 'Centro' }

function order(createdAt: string): RecentOrder {
  return {
    id: createdAt,
    branchSlug: 'x',
    branchName: 'X',
    customerName: 'Ana',
    total: 100,
    status: 'delivered',
    createdAt,
  }
}

describe('parseOrdersLimit', () => {
  it('uses the default for missing, invalid or non-positive values', () => {
    for (const raw of [null, '', 'abc', '0', '-5']) {
      expect(parseOrdersLimit(raw)).toBe(ORDERS_DEFAULT_LIMIT)
    }
  })

  it('caps the limit', () => {
    expect(parseOrdersLimit('30')).toBe(30)
    expect(parseOrdersLimit('100000')).toBe(ORDERS_MAX_LIMIT)
  })
})

describe('mapOrderRow', () => {
  it('maps numeric strings, trims names and tags the branch', () => {
    const mapped = mapOrderRow(
      {
        id: '1',
        customer_name: '  Ana  ',
        total_price: '1234.5',
        status: 'preparing',
        created_at: '2026-10-20T10:00:00Z',
      },
      branch,
    )
    expect(mapped).toMatchObject({
      branchSlug: 'centro',
      branchName: 'Centro',
      customerName: 'Ana',
      total: 1234.5,
      status: 'preparing',
    })
  })

  it('survives missing name, missing total and unknown status', () => {
    const mapped = mapOrderRow(
      { id: '2', customer_name: null, total_price: null, status: 'raro', created_at: 'x' },
      branch,
    )
    expect(mapped.customerName).toBe('')
    expect(mapped.total).toBe(0)
    expect(mapped.status).toBe('pending')
  })
})

describe('splitBranchesByActivity', () => {
  it('puts the branch with the newest order first and keeps empty ones apart', () => {
    const branches: BranchOrders[] = [
      { branchSlug: 'a', branchName: 'A', orders: [order('2026-10-19T10:00:00Z')] },
      { branchSlug: 'b', branchName: 'B', orders: [] },
      { branchSlug: 'c', branchName: 'C', orders: [order('2026-10-20T10:00:00Z')] },
    ]
    const { withOrders, empty } = splitBranchesByActivity(branches)
    expect(withOrders.map((entry) => entry.branchSlug)).toEqual(['c', 'a'])
    expect(empty.map((entry) => entry.branchSlug)).toEqual(['b'])
  })
})
