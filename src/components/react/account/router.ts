import { useSyncExternalStore } from 'react'

export type RouteId = 'overview' | 'attention' | 'orders' | 'branches' | 'settings'

export interface AccountRoute {
  id: RouteId
  path: string
  label: string
  title: string
}

export const ACCOUNT_ROUTES: AccountRoute[] = [
  { id: 'overview', path: '/account', label: 'Resumen', title: 'Resumen | Essenz' },
  { id: 'attention', path: '/account/attention', label: 'Atención', title: 'Atención | Essenz' },
  { id: 'orders', path: '/account/orders', label: 'Pedidos', title: 'Pedidos | Essenz' },
  { id: 'branches', path: '/account/branches', label: 'Sucursales', title: 'Sucursales | Essenz' },
  { id: 'settings', path: '/account/settings', label: 'Cuenta', title: 'Cuenta | Essenz' },
]

export function resolveRoute(pathname: string): AccountRoute {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return ACCOUNT_ROUTES.find((route) => route.path === clean) ?? ACCOUNT_ROUTES[0]
}

interface AnchorLike {
  origin: string
  pathname: string
  search: string
  hash: string
}

export function routeForAnchor(anchor: AnchorLike, currentOrigin: string): AccountRoute | null {
  if (anchor.origin !== currentOrigin || anchor.search || anchor.hash) return null
  const clean = anchor.pathname.length > 1 ? anchor.pathname.replace(/\/+$/, '') : anchor.pathname
  return ACCOUNT_ROUTES.find((route) => route.path === clean) ?? null
}

interface ClickLike {
  defaultPrevented: boolean
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  currentTarget: { target?: string | null; hasAttribute?: (name: string) => boolean }
}

export function shouldHandleClick(event: ClickLike) {
  if (event.defaultPrevented || event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  const target = event.currentTarget.target
  if (target && target !== '_self') return false
  if (event.currentTarget.hasAttribute?.('download')) return false
  return true
}

const listeners = new Set<() => void>()
const remembered = new Map<string, string>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

export function navigate(path: string) {
  const target = resolveRoute(path)
  const current = resolveRoute(window.location.pathname)
  remembered.set(current.path, window.location.search)
  const search = remembered.get(target.path) ?? ''
  const next = `${target.path}${search}`
  if (next === `${window.location.pathname}${window.location.search}`) return
  window.history.pushState(null, '', next)
  emit()
}

export function useRouteId(initialPath: string): RouteId {
  return useSyncExternalStore(
    subscribe,
    () => resolveRoute(window.location.pathname).id,
    () => resolveRoute(initialPath).id,
  )
}
