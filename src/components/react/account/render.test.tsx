import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildAttention } from '../../../libs/account/attention'
import { buildDashboard } from '../../../libs/account/dashboard'
import { resolvePeriod } from '../../../libs/account/period'
import type {
  AccountOverview,
  ActivityData,
  RawBranchRow,
  RawDashboard,
} from '../../../types/account'
import { AttentionList, RecentOrders } from './ActivityPanels'
import BranchTable from './BranchTable'
import KpiStrip from './KpiStrip'
import RevenueChart from './RevenueChart'

const now = new Date('2026-10-20T15:00:00Z')
const resolved = resolvePeriod({ preset: '7d' }, now)
if (!resolved.ok) throw new Error('period')
const period = resolved.period

function branch(overrides: Partial<RawBranchRow>): RawBranchRow {
  return {
    id: 'id',
    slug: 'slug',
    name: 'Sucursal',
    menuActive: true,
    revenue: 0,
    orders: 0,
    tips: 0,
    expenses: 0,
    prevRevenue: 0,
    prevOrders: 0,
    prevExpenses: 0,
    ...overrides,
  }
}

const raw: RawDashboard = {
  branches: [
    branch({
      id: 'a',
      slug: 'centro',
      name: 'Centro',
      revenue: 300000,
      orders: 30,
      expenses: 50000,
      prevRevenue: 200000,
      prevOrders: 25,
    }),
    branch({
      id: 'b',
      slug: 'norte',
      name: 'Norte',
      revenue: 100000,
      orders: 10,
      menuActive: false,
    }),
    branch({ id: 'c', slug: 'sur', name: 'Sur' }),
  ],
  series: [
    { date: '2026-10-14', revenue: 100000, orders: 10, expenses: 0 },
    { date: '2026-10-15', revenue: 300000, orders: 30, expenses: 50000 },
  ],
  prevSeries: [
    { date: '2026-10-07', revenue: 80000, orders: 8, expenses: 0 },
    { date: '2026-10-08', revenue: 120000, orders: 12, expenses: 0 },
  ],
}

const dashboard = buildDashboard(raw, period, now)

describe('componentes del panel de cuenta', () => {
  it('muestra los indicadores consolidados', () => {
    const html = renderToString(<KpiStrip totals={dashboard.totals} period={period} />)
    expect(html).toContain('Facturación')
    expect(html).toContain('Resultado estimado')
    expect(html).toContain('400.000')
  })

  it('muestra ticket promedio vacío cuando no hay pedidos', () => {
    const empty = buildDashboard(
      { branches: [branch({ id: 'a', name: 'Centro' })], series: [], prevSeries: [] },
      period,
      now,
    )
    const html = renderToString(<KpiStrip totals={empty.totals} period={period} />)
    expect(html).toContain('Sin datos para comparar')
    expect(html).toContain('—')
  })

  it('ordena sucursales por facturación y no oculta las inactivas', () => {
    const html = renderToString(
      <BranchTable branches={dashboard.branches} totals={dashboard.totals} />,
    )
    expect(html.indexOf('Centro')).toBeLessThan(html.indexOf('Norte'))
    expect(html.indexOf('Norte')).toBeLessThan(html.indexOf('Sur'))
    expect(html).toContain('Carta oculta')
    expect(html).toContain('aria-sort="descending"')
    expect(html).toContain('75,0 %')
  })

  it('muestra el gráfico con su resumen accesible', () => {
    const html = renderToString(
      <RevenueChart points={dashboard.chart.points} bucket={dashboard.chart.bucket} />,
    )
    expect(html).toContain('Facturación por día')
    expect(html).toContain('Período anterior')
    expect(html).toContain('role="img"')
  })

  it('avisa cuando no hay ventas en el período', () => {
    const html = renderToString(<RevenueChart points={[]} bucket="day" />)
    expect(html).toContain('No hay ventas registradas en este período.')
  })

  it('lista alertas con texto y acción, o confirma que todo está en orden', () => {
    const overview: AccountOverview = {
      business: { name: 'Demo', ownerName: null, ownerEmail: null },
      plan: {
        id: 'business',
        name: 'Plan Business',
        status: 'active',
        currentPeriodEnd: null,
        maxBranches: 5,
        maxProductsPerBranch: 1000,
        billingPath: null,
      },
      branches: [
        {
          id: 'b',
          slug: 'norte',
          name: 'Norte',
          isMain: false,
          menuActive: false,
          hasContactInfo: true,
          productCount: 3,
          employeeCount: 0,
        },
      ],
    }
    const activity: ActivityData = {
      recentOrders: [],
      lastOrderAt: [],
      lowStock: { total: 0, byBranch: [], items: [] },
    }
    const items = buildAttention(overview, activity, null)
    expect(items.map((item) => item.kind)).toEqual(['menu_inactive'])
    const withItems = renderToString(<AttentionList items={items} loading={false} showBranch />)
    expect(withItems).toContain('Revisar configuración')
    const none = renderToString(<AttentionList items={[]} loading={false} showBranch={false} />)
    expect(none).toContain('Todo en orden')
    const orders = renderToString(<RecentOrders orders={[]} loading={false} showBranch={false} />)
    expect(orders).toContain('Todavía no hay pedidos registrados.')
  })
})
