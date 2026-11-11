import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { prefetchApi } from './api'
import {
  ACCOUNT_ROUTES,
  navigate,
  resolveRoute,
  routeForAnchor,
  shouldHandleClick,
  useRouteId,
  type AccountRoute,
  type RouteId,
} from './router'
import { FOCUS, Skeleton } from './ui'

const loaders: Record<RouteId, () => Promise<unknown>> = {
  overview: () => import('./OverviewView'),
  attention: () => import('./AttentionView'),
  orders: () => import('./OrdersView'),
  branches: () => import('./BranchesView'),
  settings: () => import('./AccountSettingsView'),
}

const views: Record<RouteId, React.LazyExoticComponent<React.ComponentType>> = {
  overview: lazy(() => loaders.overview() as Promise<{ default: React.ComponentType }>),
  attention: lazy(() => loaders.attention() as Promise<{ default: React.ComponentType }>),
  orders: lazy(() => loaders.orders() as Promise<{ default: React.ComponentType }>),
  branches: lazy(() => loaders.branches() as Promise<{ default: React.ComponentType }>),
  settings: lazy(() => loaders.settings() as Promise<{ default: React.ComponentType }>),
}

const DATA: Record<RouteId, string[]> = {
  overview: ['/api/account/dashboard?range=30d', '/api/account/overview', '/api/account/activity'],
  attention: ['/api/account/overview', '/api/account/activity', '/api/account/dashboard?range=30d'],
  orders: ['/api/account/orders?limit=10'],
  branches: ['/api/account/overview', '/api/account/activity'],
  settings: ['/api/account/overview'],
}

function warm(id: RouteId) {
  void loaders[id]()
  DATA[id].forEach(prefetchApi)
}

function ViewSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6 p-5 sm:p-6 lg:p-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function NavLink({ route, active }: { route: AccountRoute; active: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  return (
    <a
      ref={ref}
      href={route.path}
      aria-current={active ? 'page' : undefined}
      onPointerEnter={() => warm(route.id)}
      onFocus={() => warm(route.id)}
      className={`flex min-h-11 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors ${FOCUS} ${
        active
          ? 'bg-(--clr-ink) text-white'
          : 'text-gray-700 hover:bg-gray-50 hover:text-(--clr-ink)'
      }`}
    >
      {route.label}
    </a>
  )
}

export default function AccountApp({ initialPath }: { initialPath: string }) {
  const routeId = useRouteId(initialPath)
  const route = ACCOUNT_ROUTES.find((item) => item.id === routeId) ?? resolveRoute(initialPath)
  const [mounted, setMounted] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    document.title = route.title
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [route.id, route.title])

  const View = views[route.id]

  function handleLinkClick(event: React.MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as Element).closest?.('a')
    if (!anchor) return
    const target = routeForAnchor(anchor, window.location.origin)
    if (!target) return
    const click = {
      defaultPrevented: event.defaultPrevented,
      button: event.button,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      currentTarget: anchor,
    }
    if (!shouldHandleClick(click)) return
    event.preventDefault()
    navigate(target.path)
  }

  return (
    <div
      onClick={handleLinkClick}
      className="account-shell flex min-h-screen items-start justify-center bg-(--clr-bg) md:px-6 md:py-10"
    >
      <div className="flex w-full max-w-350 flex-col border-gray-100 bg-white shadow-sm md:min-h-[calc(100vh-5rem)] md:flex-row md:border">
        <aside className="shrink-0 border-b border-gray-100 md:w-56 md:border-b-0 md:border-r">
          <div className="px-5 pb-2 pt-5 md:pb-5 md:pt-6">
            <p className="text-sm font-bold tracking-tight text-(--clr-ink)">Essenz</p>
            <p className="text-xs text-gray-600">Panel de cuenta</p>
          </div>
          <nav
            aria-label="Panel de cuenta"
            className="flex gap-0.5 overflow-x-auto px-3 pb-3 md:flex-col md:pb-4"
          >
            {ACCOUNT_ROUTES.map((item) => (
              <NavLink key={item.id} route={item} active={item.id === route.id} />
            ))}
          </nav>
        </aside>

        <main
          id="contenido"
          ref={mainRef}
          tabIndex={-1}
          aria-label={route.label}
          className="min-w-0 flex-1 focus:outline-none"
        >
          {mounted ? (
            <Suspense key={route.id} fallback={<ViewSkeleton />}>
              <View />
            </Suspense>
          ) : (
            <ViewSkeleton />
          )}
        </main>
      </div>
    </div>
  )
}
