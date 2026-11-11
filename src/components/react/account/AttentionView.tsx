import { useMemo } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import {
  buildAttention,
  groupAttentionByBranch,
  type BranchAttention,
} from '../../../libs/account/attention'
import type { AccountOverview, ActivityData, DashboardData } from '../../../types/account'
import { ATTENTION_ICON_MAP } from './ActivityPanels'
import { useApi } from './api'
import { BUTTON, EmptyPanel, ErrorPanel, InlineError, LINK, Skeleton } from './ui'

const PERIOD_TEXT = 'en los últimos 30 días'

function GridSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-3 border border-gray-200 p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

function plural(count: number) {
  return `${count} ${count === 1 ? 'aviso' : 'avisos'}`
}

export function AttentionGrid({
  withItems,
  clean,
}: {
  withItems: BranchAttention[]
  clean: { branchSlug: string; branchName: string }[]
}) {
  return (
    <>
      <ul className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {withItems.map((branch) => (
          <li key={branch.branchSlug} className="min-w-0">
            <section
              aria-labelledby={`attention-${branch.branchSlug}`}
              className="border border-gray-200 bg-white"
            >
              <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
                <h2
                  id={`attention-${branch.branchSlug}`}
                  className="min-w-0 text-base font-bold text-(--clr-ink) [overflow-wrap:anywhere]"
                >
                  {branch.branchName}
                </h2>
                <span className="shrink-0 pt-0.5 text-sm text-gray-700 tabular-nums">
                  {plural(branch.items.length)}
                </span>
              </div>
              <ul className="divide-y divide-gray-200">
                {branch.items.map((item) => {
                  const Icon = ATTENTION_ICON_MAP[item.kind]
                  return (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <Icon
                        aria-hidden="true"
                        size={18}
                        className="mt-0.5 shrink-0 text-gray-800"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900">{item.message}</p>
                        <a href={item.actionHref} className={LINK}>
                          {item.actionLabel}
                          <span className="sr-only"> en {item.branchName}</span>
                        </a>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </li>
        ))}
      </ul>

      {clean.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-gray-800">
          <CheckCircle2 aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-800" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            Sin avisos: {clean.map((branch) => branch.branchName).join(', ')}.
          </span>
        </p>
      )}
    </>
  )
}

export default function AttentionView() {
  const overview = useApi<AccountOverview>('/api/account/overview')
  const activity = useApi<ActivityData>('/api/account/activity')
  const dashboard = useApi<DashboardData>('/api/account/dashboard?range=30d')

  const branches = overview.data?.branches ?? []
  const items = useMemo(
    () => buildAttention(overview.data, activity.data, dashboard.data, PERIOD_TEXT),
    [overview.data, activity.data, dashboard.data],
  )
  const { withItems, clean } = useMemo(
    () => groupAttentionByBranch(branches, items),
    [branches, items],
  )

  const loading = overview.loading || activity.loading
  const refreshing = overview.refreshing || activity.refreshing || dashboard.refreshing

  function reloadAll() {
    overview.reload()
    activity.reload()
    dashboard.reload()
  }

  const summary = loading
    ? 'Revisando tus sucursales'
    : items.length === 0
      ? 'Ninguna sucursal necesita atención ahora'
      : `${plural(items.length)} en ${withItems.length} de ${branches.length} ${
          branches.length === 1 ? 'sucursal' : 'sucursales'
        }`

  return (
    <div className="space-y-6 p-5 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-(--clr-ink)">Atención</h1>
          <p aria-live="polite" className="mt-1 text-sm text-gray-700">
            {summary}
          </p>
        </div>
        <button type="button" onClick={reloadAll} disabled={refreshing} className={BUTTON}>
          <RefreshCw
            aria-hidden="true"
            size={16}
            className={refreshing ? 'motion-safe:animate-spin' : ''}
          />
          {refreshing ? 'Actualizando' : 'Actualizar'}
        </button>
      </header>

      {activity.error && activity.data && (
        <InlineError error={activity.error} onRetry={activity.reload} />
      )}
      {dashboard.error && <InlineError error={dashboard.error} onRetry={dashboard.reload} />}

      {overview.error && !overview.data ? (
        <ErrorPanel error={overview.error} onRetry={overview.reload} />
      ) : activity.error && !activity.data ? (
        <ErrorPanel error={activity.error} onRetry={activity.reload} />
      ) : loading ? (
        <GridSkeleton />
      ) : branches.length === 0 ? (
        <EmptyPanel title="Tu cuenta todavía no tiene sucursales">
          Cuando haya una sucursal vas a ver acá lo que necesita atención.
        </EmptyPanel>
      ) : items.length === 0 ? (
        <EmptyPanel title="Todo en orden">
          Las cartas están activas, el stock está por encima del mínimo y los datos de contacto
          están completos.
        </EmptyPanel>
      ) : (
        <AttentionGrid withItems={withItems} clean={clean} />
      )}
    </div>
  )
}
