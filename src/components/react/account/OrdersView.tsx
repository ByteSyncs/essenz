import { useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { formatRelativeTime } from '../../../libs/account/format'
import {
  ORDERS_DEFAULT_LIMIT,
  ORDERS_MAX_LIMIT,
  splitBranchesByActivity,
} from '../../../libs/account/orders'
import type { BranchOrders, OrdersData } from '../../../types/account'
import { OrderRow, PanelSkeleton } from './ActivityPanels'
import { useApi } from './api'
import { BUTTON, EmptyPanel, ErrorPanel, InlineError } from './ui'

const STEP = 20

export function OrdersGrid({
  withOrders,
  empty,
}: {
  withOrders: BranchOrders[]
  empty: BranchOrders[]
}) {
  return (
    <>
      <ul className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {withOrders.map((branch) => (
          <li key={branch.branchSlug} className="min-w-0">
            <section
              aria-labelledby={`orders-${branch.branchSlug}`}
              className="border border-gray-200 bg-white"
            >
              <div className="border-b border-gray-200 px-4 py-3">
                <h2
                  id={`orders-${branch.branchSlug}`}
                  className="text-base font-bold text-(--clr-ink) [overflow-wrap:anywhere]"
                >
                  {branch.branchName}
                </h2>
                <p className="text-sm text-gray-700">
                  Último pedido{' '}
                  <time dateTime={branch.orders[0].createdAt}>
                    {formatRelativeTime(branch.orders[0].createdAt).toLowerCase()}
                  </time>
                </p>
              </div>
              <ul className="divide-y divide-gray-200 px-4">
                {branch.orders.map((order) => (
                  <OrderRow key={order.id} order={order} showBranch={false} />
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ul>

      {empty.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-gray-800">
          <CheckCircle2 aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-gray-600" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            Sin pedidos registrados: {empty.map((branch) => branch.branchName).join(', ')}.
          </span>
        </p>
      )}
    </>
  )
}

function GridSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="border border-gray-200 p-4">
          <PanelSkeleton />
        </div>
      ))}
    </div>
  )
}

export default function OrdersView() {
  const [limit, setLimit] = useState(ORDERS_DEFAULT_LIMIT)
  const orders = useApi<OrdersData>(`/api/account/orders?limit=${limit}`)

  const { withOrders, empty } = useMemo(
    () => splitBranchesByActivity(orders.data?.branches ?? []),
    [orders.data],
  )

  const total = withOrders.reduce((sum, branch) => sum + branch.orders.length, 0)
  const mayHaveMore =
    orders.data !== null &&
    limit < ORDERS_MAX_LIMIT &&
    withOrders.some((b) => b.orders.length >= limit)

  const summary = orders.loading
    ? 'Buscando los pedidos de tus sucursales'
    : withOrders.length === 0
      ? 'Todavía no hay pedidos registrados'
      : `Los últimos pedidos de cada sucursal, hasta ${limit} por sucursal`

  return (
    <div className="space-y-6 p-5 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-(--clr-ink)">Pedidos</h1>
          <p aria-live="polite" className="mt-1 text-sm text-gray-700">
            {summary}
          </p>
        </div>
        <button
          type="button"
          onClick={orders.reload}
          disabled={orders.refreshing}
          className={BUTTON}
        >
          <RefreshCw
            aria-hidden="true"
            size={16}
            className={orders.refreshing ? 'motion-safe:animate-spin' : ''}
          />
          {orders.refreshing ? 'Actualizando' : 'Actualizar'}
        </button>
      </header>

      {orders.error && orders.data && <InlineError error={orders.error} onRetry={orders.reload} />}

      {orders.error && !orders.data ? (
        <ErrorPanel error={orders.error} onRetry={orders.reload} />
      ) : orders.loading ? (
        <GridSkeleton />
      ) : (orders.data?.branches.length ?? 0) === 0 ? (
        <EmptyPanel title="Tu cuenta todavía no tiene sucursales">
          Cuando haya una sucursal vas a ver acá sus pedidos.
        </EmptyPanel>
      ) : withOrders.length === 0 ? (
        <EmptyPanel title="Todavía no hay pedidos registrados">
          Los pedidos que cargue el personal de cada sucursal aparecen acá.
        </EmptyPanel>
      ) : (
        <div aria-busy={orders.refreshing} className={orders.refreshing ? 'opacity-60' : ''}>
          <div className="space-y-6">
            <OrdersGrid withOrders={withOrders} empty={empty} />
          </div>
        </div>
      )}

      {mayHaveMore && (
        <button
          type="button"
          disabled={orders.refreshing}
          onClick={() => setLimit((current) => Math.min(current + STEP, ORDERS_MAX_LIMIT))}
          className={BUTTON}
        >
          Mostrar más pedidos
        </button>
      )}

      {total > 0 && limit >= ORDERS_MAX_LIMIT && (
        <p className="text-sm text-gray-700">
          Se muestran hasta {ORDERS_MAX_LIMIT} pedidos por sucursal.
        </p>
      )}
    </div>
  )
}
