import { CheckCircle2, EyeOff, Gauge, MapPin, Package, ShoppingBag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { formatDayAndTime, formatMoney, formatRelativeTime } from '../../../libs/account/format'
import type { AttentionItem, AttentionKind, OrderStatus, RecentOrder } from '../../../types/account'
import { LINK, Skeleton } from './ui'

const FIT_MAX = 5
const DESKTOP_QUERY = '(min-width: 1024px)'

const ATTENTION_ICONS: Record<
  AttentionKind,
  ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false'; className?: string }>
> = {
  menu_inactive: EyeOff,
  low_stock: Package,
  no_orders: ShoppingBag,
  no_contact: MapPin,
  product_limit: Gauge,
}

export const ATTENTION_ICON_MAP = ATTENTION_ICONS

export function PanelSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-2 py-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}

interface AttentionListProps {
  items: AttentionItem[]
  loading: boolean
  showBranch: boolean
  limit?: number
  moreHref?: string
}

export function AttentionList({
  items: allItems,
  loading,
  showBranch,
  limit,
  moreHref,
}: AttentionListProps) {
  const items = limit === undefined ? allItems : allItems.slice(0, limit)
  const hidden = allItems.length - items.length
  return (
    <section
      aria-labelledby="attention-title"
      className="flex flex-col border border-gray-200 p-4 sm:p-5"
    >
      <h2 id="attention-title" className="text-lg font-bold text-(--clr-ink)">
        Necesita atención
      </h2>
      <div className="mt-3 flex flex-1 flex-col">
        {loading ? (
          <PanelSkeleton />
        ) : items.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-gray-800">
            <CheckCircle2
              aria-hidden="true"
              size={18}
              className="mt-0.5 shrink-0 text-emerald-800"
            />
            Todo en orden. Ninguna sucursal necesita atención ahora.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {items.map((item) => {
              const Icon = ATTENTION_ICONS[item.kind]
              return (
                <li key={item.id} className="flex items-start gap-3 py-3">
                  <Icon aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-gray-800" />
                  <div className="min-w-0 flex-1">
                    {showBranch && (
                      <p className="text-sm font-medium text-(--clr-ink)">{item.branchName}</p>
                    )}
                    <p className="text-sm text-gray-800">{item.message}</p>
                    <a href={item.actionHref} className={LINK}>
                      {item.actionLabel}
                      <span className="sr-only"> en {item.branchName}</span>
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {hidden > 0 && moreHref && (
          <a href={moreHref} className={`${LINK} mt-auto self-start pt-3`}>
            Ver los {allItems.length} avisos
          </a>
        )}
      </div>
    </section>
  )
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  preparing: 'En preparación',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export function OrderRow({ order, showBranch }: { order: RecentOrder; showBranch: boolean }) {
  const name = order.customerName.trim() || 'Cliente sin nombre'
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p title={name} className="truncate text-sm font-medium text-(--clr-ink)">
          {name}
        </p>
        <p className="text-sm text-gray-700">
          {showBranch && <>{order.branchName} · </>}
          <time dateTime={order.createdAt} title={formatDayAndTime(order.createdAt)}>
            {formatRelativeTime(order.createdAt)}
          </time>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-medium tabular-nums ${
            order.status === 'cancelled' ? 'text-gray-600 line-through' : 'text-(--clr-ink)'
          }`}
        >
          {formatMoney(order.total)}
        </p>
        <p className="text-xs text-gray-700">{STATUS_LABEL[order.status]}</p>
      </div>
    </li>
  )
}

interface RecentOrdersProps {
  orders: RecentOrder[]
  loading: boolean
  showBranch: boolean
  limit?: number
  moreHref?: string
}

export function RecentOrders({ orders, loading, showBranch, limit, moreHref }: RecentOrdersProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [fitted, setFitted] = useState<number | null>(null)
  const compact = limit !== undefined

  useEffect(() => {
    const wrap = wrapRef.current
    if (!compact || !wrap) return

    const media = window.matchMedia(DESKTOP_QUERY)

    const measure = () => {
      if (!media.matches) {
        setFitted(null)
        return
      }
      const row = wrap.querySelector('li')
      if (!row) return
      const rowHeight = row.getBoundingClientRect().height
      if (rowHeight <= 0) return
      const rows = Math.floor((wrap.clientHeight + 1) / rowHeight)
      setFitted(Math.max(1, Math.min(FIT_MAX, rows)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(wrap)
    media.addEventListener('change', measure)

    return () => {
      observer.disconnect()
      media.removeEventListener('change', measure)
    }
  }, [compact, loading, orders.length])

  const visibleCount = limit === undefined ? orders.length : (fitted ?? limit)
  const visible = orders.slice(0, visibleCount)

  return (
    <section
      aria-labelledby="orders-title"
      className="flex flex-col border border-gray-200 p-4 sm:p-5"
    >
      <h2 id="orders-title" className="text-lg font-bold text-(--clr-ink)">
        Pedidos recientes
      </h2>
      <div className="mt-3 flex flex-1 flex-col">
        <div ref={wrapRef} className={compact ? 'lg:relative lg:min-h-16 lg:flex-1' : undefined}>
          {loading ? (
            <PanelSkeleton />
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-800">Todavía no hay pedidos registrados.</p>
          ) : (
            <ul
              className={`divide-y divide-gray-200${
                compact ? ' lg:absolute lg:inset-0 lg:overflow-hidden' : ''
              }`}
            >
              {visible.map((order) => (
                <OrderRow key={order.id} order={order} showBranch={showBranch} />
              ))}
            </ul>
          )}
        </div>
        {!loading && orders.length > 0 && moreHref && (
          <a href={moreHref} className={`${LINK} mt-auto self-start pt-3`}>
            Ver todos los pedidos
          </a>
        )}
      </div>
    </section>
  )
}
