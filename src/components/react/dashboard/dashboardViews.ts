export type DashboardView =
  | 'home'
  | 'menu'
  | 'orders'
  | 'cash'
  | 'qr'
  | 'settings'
  | 'inventory'
  | 'statistics'
  | 'sales'
  | 'expenses'
  | 'access'

export const OWNER_VIEWS: DashboardView[] = [
  'home',
  'menu',
  'inventory',
  'cash',
  'sales',
  'statistics',
  'qr',
  'settings',
  'access',
]

export const STAFF_VIEWS: DashboardView[] = [
  'orders',
  'sales',
  'cash',
  'menu',
  'inventory',
  'expenses',
  'statistics',
  'qr',
  'settings',
]

export const ALL_VIEWS: DashboardView[] = Array.from(new Set([...OWNER_VIEWS, ...STAFF_VIEWS]))

export function viewsForRole(isOwner: boolean) {
  return isOwner ? OWNER_VIEWS : STAFF_VIEWS
}

export function defaultViewForRole(isOwner: boolean): DashboardView {
  return isOwner ? 'home' : 'orders'
}
