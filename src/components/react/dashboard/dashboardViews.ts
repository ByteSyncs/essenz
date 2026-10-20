export type DashboardView =
  | 'home'
  | 'menu'
  | 'orders'
  | 'qr'
  | 'settings'
  | 'inventory'
  | 'statistics'
  | 'expenses'
  | 'team'

export const ALL_VIEWS: DashboardView[] = [
  'home',
  'menu',
  'orders',
  'qr',
  'settings',
  'inventory',
  'statistics',
  'expenses',
  'team',
]

export const OWNER_ONLY_VIEWS: DashboardView[] = [
  'menu',
  'settings',
  'statistics',
  'expenses',
  'team',
]
