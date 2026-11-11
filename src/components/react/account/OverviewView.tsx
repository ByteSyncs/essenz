import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { buildAttention, prioritizeAttention } from '../../../libs/account/attention'
import { formatDateRange, formatTime } from '../../../libs/account/format'
import { PERIOD_PRESETS, isValidDate } from '../../../libs/account/period'
import type {
  AccountOverview,
  ActivityData,
  DashboardData,
  PeriodPreset,
} from '../../../types/account'
import { AttentionList, RecentOrders } from './ActivityPanels'
import { useApi } from './api'
import BranchTable from './BranchTable'
import KpiStrip, { KpiSkeleton } from './KpiStrip'
import PeriodControl, { type PeriodValue } from './PeriodControl'
import RevenueChart, { ChartSkeleton } from './RevenueChart'
import { BUTTON, EmptyPanel, ErrorPanel, InlineError, LINK, Skeleton } from './ui'

const DEFAULT_PERIOD: PeriodValue = { range: '30d', from: '', to: '' }

function readPeriod(): PeriodValue {
  const params = new URLSearchParams(window.location.search)
  const range = params.get('range') as PeriodPreset | null
  if (!range || !PERIOD_PRESETS.includes(range)) return DEFAULT_PERIOD
  if (range !== 'custom') return { range, from: '', to: '' }
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  return isValidDate(from) && isValidDate(to) ? { range, from, to } : DEFAULT_PERIOD
}

function buildQuery(period: PeriodValue) {
  const params = new URLSearchParams({ range: period.range })
  if (period.range === 'custom') {
    params.set('from', period.from)
    params.set('to', period.to)
  }
  return params.toString()
}

export default function OverviewView() {
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setPeriod(readPeriod())
    setReady(true)
  }, [])

  const query = buildQuery(period)
  const dashboard = useApi<DashboardData>(ready ? `/api/account/dashboard?${query}` : null)
  const overview = useApi<AccountOverview>('/api/account/overview')
  const activity = useApi<ActivityData>('/api/account/activity')

  function changePeriod(next: PeriodValue) {
    setPeriod(next)
    window.history.replaceState(null, '', `${window.location.pathname}?${buildQuery(next)}`)
  }

  function reloadAll() {
    dashboard.reload()
    overview.reload()
    activity.reload()
  }

  const data = dashboard.data
  const branchCount = data?.branches.length ?? overview.data?.branches.length ?? 0
  const multiple = branchCount > 1
  const attention = useMemo(
    () => prioritizeAttention(buildAttention(overview.data, activity.data, dashboard.data)),
    [overview.data, activity.data, dashboard.data],
  )
  const refreshing = dashboard.refreshing || overview.refreshing || activity.refreshing
  const singleBranch = overview.data?.branches.length === 1 ? overview.data.branches[0] : null

  return (
    <div className="space-y-8 p-5 sm:p-6 lg:p-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {overview.data ? (
              <h1 className="truncate text-2xl font-bold text-(--clr-ink)">
                {overview.data.business.name}
              </h1>
            ) : (
              <h1 className="text-2xl font-bold text-(--clr-ink)">
                {overview.loading ? <Skeleton className="h-8 w-56" /> : 'Resumen'}
              </h1>
            )}
            <p aria-live="polite" className="mt-1 text-sm text-gray-700">
              {data
                ? `${formatDateRange(data.period.from, data.period.to)}${
                    data.period.includesToday ? ` · Datos al ${formatTime(data.generatedAt)}` : ''
                  }`
                : 'Resumen de ventas y gastos de todas tus sucursales'}
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
        </div>
        <PeriodControl value={period} onChange={changePeriod} />
      </header>

      {dashboard.error && data && (
        <InlineError error={dashboard.error} onRetry={dashboard.reload} />
      )}

      <div
        aria-busy={dashboard.refreshing}
        className={`space-y-8 transition-opacity ${dashboard.refreshing ? 'opacity-60' : ''}`}
      >
        {dashboard.error && !data ? (
          <ErrorPanel error={dashboard.error} onRetry={dashboard.reload} />
        ) : !data ? (
          <>
            <KpiSkeleton />
            <ChartSkeleton />
          </>
        ) : data.branches.length === 0 ? (
          <EmptyPanel title="Tu cuenta todavía no tiene sucursales">
            Cuando haya una sucursal vas a ver acá sus ventas, pedidos y gastos.
          </EmptyPanel>
        ) : (
          <>
            <KpiStrip totals={data.totals} period={data.period} />
            <RevenueChart points={data.chart.points} bucket={data.chart.bucket} />
            {multiple ? (
              <BranchTable branches={data.branches} totals={data.totals} />
            ) : (
              singleBranch && (
                <section
                  aria-labelledby="single-branch-title"
                  className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 p-4 sm:p-5"
                >
                  <div>
                    <h2 id="single-branch-title" className="text-lg font-bold text-(--clr-ink)">
                      {singleBranch.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-700">
                      Tu cuenta tiene una sola sucursal, por eso estos números son los de su panel.
                    </p>
                  </div>
                  <a href={`/${singleBranch.slug}/admin/dashboard`} className={BUTTON}>
                    Abrir panel de la sucursal
                  </a>
                </section>
              )
            )}
          </>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {activity.error && !activity.data ? (
          <div className="lg:col-span-2">
            <ErrorPanel error={activity.error} onRetry={activity.reload} />
          </div>
        ) : (
          <>
            <AttentionList
              items={attention}
              loading={overview.loading || activity.loading}
              showBranch={multiple}
              limit={3}
              moreHref="/account/attention"
            />
            <RecentOrders
              orders={activity.data?.recentOrders ?? []}
              loading={activity.loading}
              showBranch={multiple}
              limit={3}
              moreHref="/account/orders"
            />
          </>
        )}
      </div>

      <p className="text-sm text-gray-700">
        Para ver o cambiar el plan, las sucursales o los datos de la cuenta, andá a{' '}
        <a href="/account/settings" className={LINK}>
          Cuenta
        </a>
        .
      </p>
    </div>
  )
}
