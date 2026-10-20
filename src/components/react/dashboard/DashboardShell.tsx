import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import HomeView from './views/HomeView'
import MenuView from './views/MenuView'
import OrdersView from './views/OrdersView'
import QRView from './views/QrView'
import SettingsView from './views/SettingsView'
import InventoryView from './views/InventoryView'
import StatisticsView from './views/StatisticsView'
import ExpensesView from './views/ExpensesView'
import TeamView from './views/TeamView'
import { ALL_VIEWS, OWNER_ONLY_VIEWS, type DashboardView } from './dashboardViews'

export type { DashboardView } from './dashboardViews'

interface DashboardShellProps {
  slug: string
  role: string
}

const views: Record<DashboardView, React.ComponentType<{ slug: string }>> = {
  home: HomeView,
  menu: MenuView,
  orders: OrdersView,
  qr: QRView,
  settings: SettingsView,
  inventory: InventoryView,
  statistics: StatisticsView,
  expenses: ExpensesView,
  team: TeamView,
}

export default function DashboardShell({ slug, role }: DashboardShellProps) {
  const isOwner = role === 'admin' || role === 'owner'
  const [activeView, setActiveView] = useState<DashboardView>('home')
  const [visited, setVisited] = useState<DashboardView[]>([])
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const savedView = sessionStorage.getItem('essenz_admin_view') as DashboardView
    const isValid =
      ALL_VIEWS.includes(savedView) && (isOwner || !OWNER_ONLY_VIEWS.includes(savedView))
    const initial: DashboardView = isValid ? savedView : 'home'
    setActiveView(initial)
    setVisited([initial])
    setReady(true)
  }, [isOwner])

  const handleNav = useCallback(
    (view: DashboardView) => {
      if (!isOwner && OWNER_ONLY_VIEWS.includes(view)) return
      setActiveView(view)
      setVisited((prev) => (prev.includes(view) ? prev : [...prev, view]))
      sessionStorage.setItem('essenz_admin_view', view)
      setSidebarOpen(false)
    },
    [isOwner],
  )

  return (
    <div className="min-h-screen bg-(--clr-bg) flex items-start justify-center py-6 px-4 md:py-10 md:px-6">
      <div
        className="w-full flex bg-white border border-gray-100 shadow-sm overflow-hidden"
        style={{ maxWidth: '1400px', minHeight: 'calc(100vh - 5rem)', borderRadius: 0 }}
      >
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl md:hidden flex flex-col"
            >
              <Sidebar
                active={activeView}
                onNav={handleNav}
                slug={slug}
                isOwner={isOwner}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="hidden md:flex flex-col border-r border-gray-100 shrink-0"
          style={{ width: 220 }}
        >
          <Sidebar active={activeView} onNav={handleNav} slug={slug} isOwner={isOwner} />
        </div>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex md:hidden items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Abrir menú"
            >
              <svg
                className="w-5 h-5 text-(--clr-ink)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-(--clr-accent)">
              Essenz
            </span>
            <div className="w-9" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {ready &&
              visited.map((view) => {
                const View = views[view]
                return (
                  <div key={view} className={view === activeView ? 'block h-full' : 'hidden'}>
                    <View slug={slug} />
                  </div>
                )
              })}
          </div>
        </main>
      </div>
    </div>
  )
}
