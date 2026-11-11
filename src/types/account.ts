export type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'last_month' | 'custom'

export interface PeriodInfo {
  preset: PeriodPreset
  from: string
  to: string
  prevFrom: string
  prevTo: string
  days: number
  startsAt: string
  endsAt: string
  prevStartsAt: string
  prevEndsAt: string
  includesToday: boolean
}

export interface RawBranchRow {
  id: string
  slug: string
  name: string
  menuActive: boolean
  revenue: number
  orders: number
  tips: number
  expenses: number
  prevRevenue: number
  prevOrders: number
  prevExpenses: number
}

export interface RawSeriesPoint {
  date: string
  revenue: number
  orders: number
  expenses: number
}

export interface RawDashboard {
  branches: RawBranchRow[]
  series: RawSeriesPoint[]
  prevSeries: RawSeriesPoint[]
}

export type DeltaKind = 'up' | 'down' | 'flat' | 'new' | 'none'

export interface DeltaInfo {
  kind: DeltaKind
  pct: number | null
}

export interface BranchPerformance extends RawBranchRow {
  avgTicket: number | null
  result: number
  share: number | null
  revenueDelta: DeltaInfo
  ordersDelta: DeltaInfo
}

export interface Totals {
  revenue: number
  orders: number
  tips: number
  expenses: number
  result: number
  avgTicket: number | null
  prevRevenue: number
  prevOrders: number
  prevExpenses: number
  prevResult: number
  prevAvgTicket: number | null
  revenueDelta: DeltaInfo
  ordersDelta: DeltaInfo
  avgTicketDelta: DeltaInfo
  expensesDelta: DeltaInfo
  resultDelta: DeltaInfo
}

export type ChartBucket = 'day' | 'week'

export interface ChartPoint {
  date: string
  endDate: string
  revenue: number
  orders: number
  expenses: number
  prevDate: string | null
  prevRevenue: number | null
}

export interface DashboardData {
  period: PeriodInfo
  totals: Totals
  branches: BranchPerformance[]
  chart: { bucket: ChartBucket; points: ChartPoint[] }
  generatedAt: string
}

export type OrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled'

export interface RecentOrder {
  id: string
  branchSlug: string
  branchName: string
  customerName: string
  total: number
  status: OrderStatus
  createdAt: string
}

export interface BranchOrders {
  branchSlug: string
  branchName: string
  orders: RecentOrder[]
}

export interface OrdersData {
  branches: BranchOrders[]
  limit: number
}

export interface LowStockItem {
  branchSlug: string
  branchName: string
  name: string
  stock: number
  stockMin: number
  unit: string
}

export interface ActivityData {
  recentOrders: RecentOrder[]
  lastOrderAt: { branchSlug: string; lastOrderAt: string | null }[]
  lowStock: {
    total: number
    byBranch: { branchSlug: string; items: number }[]
    items: LowStockItem[]
  }
}

export type SubscriptionStatus =
  'active' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' | 'pending_payment' | 'none'

export interface BranchOverview {
  id: string
  slug: string
  name: string
  isMain: boolean
  menuActive: boolean
  hasContactInfo: boolean
  productCount: number
  employeeCount: number
}

export interface AccountOverview {
  business: { name: string; ownerName: string | null; ownerEmail: string | null }
  plan: {
    id: string | null
    name: string
    status: SubscriptionStatus
    currentPeriodEnd: string | null
    maxBranches: number | null
    maxProductsPerBranch: number | null
    billingPath: string | null
  }
  branches: BranchOverview[]
}

export type AttentionKind =
  'menu_inactive' | 'no_contact' | 'low_stock' | 'no_orders' | 'product_limit'

export interface AttentionItem {
  id: string
  kind: AttentionKind
  branchSlug: string
  branchName: string
  message: string
  actionLabel: string
  actionHref: string
}
