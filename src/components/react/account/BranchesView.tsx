import { useMemo } from 'react'
import { formatInteger, formatRelativeTime } from '../../../libs/account/format'
import type { AccountOverview, ActivityData, BranchOverview } from '../../../types/account'
import { useApi } from './api'
import { BUTTON, EmptyPanel, ErrorPanel, FOCUS, LINK, Skeleton } from './ui'

function limitText(limit: number | null) {
  return limit === null ? 'a medida' : formatInteger(limit)
}

interface BranchCardProps {
  branch: BranchOverview
  maxProducts: number | null
  lastOrderAt: string | null | undefined
  lowStock: number | undefined
  activityLoading: boolean
}

function BranchCard({
  branch,
  maxProducts,
  lastOrderAt,
  lowStock,
  activityLoading,
}: BranchCardProps) {
  const panel = `/${branch.slug}/admin/dashboard`
  return (
    <li className="border border-gray-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-(--clr-ink)">{branch.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span>/{branch.slug}</span>
            {branch.isMain && (
              <span className="border border-gray-400 px-1.5 py-0.5 text-xs text-gray-800">
                Principal
              </span>
            )}
            <span
              className={`border px-1.5 py-0.5 text-xs ${
                branch.menuActive
                  ? 'border-emerald-700 text-emerald-900'
                  : 'border-gray-400 text-gray-800'
              }`}
            >
              {branch.menuActive ? 'Carta pública activa' : 'Carta pública oculta'}
            </span>
          </p>
        </div>
        <a href={panel} className={BUTTON}>
          Abrir panel
          <span className="sr-only"> de {branch.name}</span>
        </a>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-3">
        <div>
          <dt className="text-gray-700">Productos</dt>
          <dd className="font-medium text-(--clr-ink)">
            {formatInteger(branch.productCount)} de {limitText(maxProducts)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-700">Último pedido</dt>
          <dd className="font-medium text-(--clr-ink)">
            {activityLoading ? (
              <Skeleton className="mt-1 h-4 w-24" />
            ) : (
              formatRelativeTime(lastOrderAt ?? null)
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-700">Insumos con stock bajo</dt>
          <dd className="font-medium text-(--clr-ink)">
            {activityLoading ? (
              <Skeleton className="mt-1 h-4 w-10" />
            ) : (
              formatInteger(lowStock ?? 0)
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-x-5">
        <a href={`${panel}?view=statistics`} className={LINK}>
          Estadísticas
        </a>
        <a href={`${panel}?view=settings`} className={LINK}>
          Configuración
        </a>
        <a
          href={`/${branch.slug}/menu`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${LINK} ${FOCUS}`}
        >
          Ver carta pública
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      </div>
    </li>
  )
}

export default function BranchesView() {
  const overview = useApi<AccountOverview>('/api/account/overview')
  const activity = useApi<ActivityData>('/api/account/activity')

  const lastOrders = useMemo(
    () =>
      new Map(
        (activity.data?.lastOrderAt ?? []).map((entry) => [entry.branchSlug, entry.lastOrderAt]),
      ),
    [activity.data],
  )
  const lowStock = useMemo(
    () =>
      new Map(
        (activity.data?.lowStock.byBranch ?? []).map((entry) => [entry.branchSlug, entry.items]),
      ),
    [activity.data],
  )

  const data = overview.data
  const used = data?.branches.length ?? 0
  const limit = data?.plan.maxBranches ?? null
  const remaining = limit === null ? null : Math.max(0, limit - used)

  return (
    <div className="space-y-6 p-5 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-(--clr-ink)">Sucursales</h1>
        <p className="mt-1 text-sm text-gray-700">
          Cada sucursal tiene su propia carta, pedidos, gastos, inventario y estadísticas.
        </p>
      </header>

      {overview.error && !data ? (
        <ErrorPanel error={overview.error} onRetry={overview.reload} />
      ) : !data ? (
        <div aria-hidden="true" className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <>
          <section aria-labelledby="limit-title" className="border border-gray-200 p-4 sm:p-5">
            <h2 id="limit-title" className="text-base font-bold text-(--clr-ink)">
              {limit === null
                ? `${formatInteger(used)} ${used === 1 ? 'sucursal' : 'sucursales'} en tu plan ${data.plan.name}`
                : `${formatInteger(used)} de ${formatInteger(limit)} sucursales de tu ${data.plan.name}`}
            </h2>
            {limit !== null && (
              <div aria-hidden="true" className="mt-3 h-1.5 w-full max-w-md bg-gray-200">
                <div
                  className="h-full bg-(--clr-ink)"
                  style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                />
              </div>
            )}
            <p className="mt-3 max-w-prose text-sm text-gray-700">
              {remaining === null
                ? 'Tu plan no tiene un límite fijo de sucursales.'
                : remaining > 0
                  ? `Tu plan permite sumar ${formatInteger(remaining)} ${remaining === 1 ? 'sucursal más' : 'sucursales más'}.`
                  : 'Ya usás todas las sucursales que permite tu plan.'}{' '}
              Crear, editar o desactivar sucursales todavía no está disponible desde el panel.
            </p>
          </section>

          {data.branches.length === 0 ? (
            <EmptyPanel title="Tu cuenta todavía no tiene sucursales" />
          ) : (
            <ul className="space-y-4">
              {data.branches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  maxProducts={data.plan.maxProductsPerBranch}
                  lastOrderAt={lastOrders.get(branch.slug)}
                  lowStock={lowStock.get(branch.slug)}
                  activityLoading={activity.loading}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
