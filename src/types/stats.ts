export interface StatSummary {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  orderCount: number
  totalTips: number
}

export interface RevenueHistoryItem {
  date: string
  revenue: number
  expenses: number
}

export interface PaymentMethodItem {
  name: string
  value: number
  color: string
}

export interface ExpenseCategoryItem {
  category: string
  amount: number
}

export interface ProductRankItem {
  name: string
  qty: number
}

export interface HourlyDistributionItem {
  hourRange: string
  count: number
}

export interface StatsData {
  summary: StatSummary
  revenueHistory: RevenueHistoryItem[]
  paymentMethods: PaymentMethodItem[]
  topExpenses: ExpenseCategoryItem[]
  topProducts: ProductRankItem[]
  hourlyDistribution: HourlyDistributionItem[]
}
