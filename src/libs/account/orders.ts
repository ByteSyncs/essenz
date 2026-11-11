import type { BranchOrders, OrderStatus, RecentOrder } from '../../types/account'

export const ORDERS_DEFAULT_LIMIT = 10
export const ORDERS_MAX_LIMIT = 50

const STATUSES: OrderStatus[] = ['pending', 'preparing', 'delivered', 'cancelled']

export interface OrderRow {
  id: string
  customer_name: string | null
  total_price: number | string | null
  status: string
  created_at: string
}

export function parseOrdersLimit(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return ORDERS_DEFAULT_LIMIT
  return Math.min(parsed, ORDERS_MAX_LIMIT)
}

export function mapOrderRow(row: OrderRow, branch: { slug: string; name: string }): RecentOrder {
  const total = Number(row.total_price ?? 0)
  return {
    id: row.id,
    branchSlug: branch.slug,
    branchName: branch.name,
    customerName: row.customer_name?.trim() ?? '',
    total: Number.isFinite(total) ? total : 0,
    status: STATUSES.includes(row.status as OrderStatus) ? (row.status as OrderStatus) : 'pending',
    createdAt: row.created_at,
  }
}

export function splitBranchesByActivity(branches: BranchOrders[]) {
  const withOrders = branches
    .filter((branch) => branch.orders.length > 0)
    .sort(
      (a, b) =>
        new Date(b.orders[0].createdAt).getTime() - new Date(a.orders[0].createdAt).getTime(),
    )
  const empty = branches.filter((branch) => branch.orders.length === 0)
  return { withOrders, empty }
}
