import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import HomeView from './views/HomeView'
import MenuView from './views/MenuView'
import OrdersView from './views/OrdersView'
import QRView from './views/QrView'
import SettingsView from './views/SettingsView'

export type DashboardView = 'home' | 'menu' | 'orders' | 'qr' | 'settings'

interface DashboardShellProps {
  slug: string
}

const views: Record<DashboardView, React.ComponentType<{ slug: string }>> = {
  home: HomeView,
  menu: MenuView,
  orders: OrdersView,
  qr: QRView,
  settings: SettingsView,
}

export default function DashboardShell({ slug }: DashboardShellProps) {
  const [activeView, setActiveView] = useState<DashboardView>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const savedView = sessionStorage.getItem('essenz_admin_view') as DashboardView
    if (['home', 'menu', 'orders', 'qr', 'settings'].includes(savedView)) {
      setActiveView(savedView)
    }
  }, [])

  const handleNav = useCallback((view: DashboardView) => {
    setActiveView(view)
    sessionStorage.setItem('essenz_admin_view', view)
    setSidebarOpen(false)
  }, [])

  const ActiveView = views[activeView]

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
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="hidden md:flex flex-col border-r border-gray-100 shrink-0"
          style={{ width: 220 }}
        >
          <Sidebar active={activeView} onNav={handleNav} slug={slug} />
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

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex-1 overflow-y-auto"
            >
              <ActiveView slug={slug} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
