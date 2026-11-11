import { renderToString as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { splitBranchesByActivity } from '../../../libs/account/orders'
import type { BranchOrders, RecentOrder } from '../../../types/account'
import { RecentOrders } from './ActivityPanels'
import { OrdersGrid } from './OrdersView'

const renderToString = (node: Parameters<typeof render>[0]) =>
  render(node).replaceAll('<!-- -->', '')

const LONG_BRANCH =
  'Panadería y Confitería Los Hermanos Fernández-Montenegro Sucursal Centro Histórico'
const LONG_CUSTOMER = 'María de los Ángeles Fernández de Alvear y Montenegro Ibarguren'

function order(id: string, overrides: Partial<RecentOrder> = {}): RecentOrder {
  return {
    id,
    branchSlug: 'a',
    branchName: LONG_BRANCH,
    customerName: 'Ana',
    total: 3500,
    status: 'delivered',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    ...overrides,
  }
}

const branches: BranchOrders[] = [
  {
    branchSlug: 'a',
    branchName: LONG_BRANCH,
    orders: [
      order('1', { customerName: LONG_CUSTOMER, total: 12_345_678.9 }),
      order('2', {
        customerName: 'SinEspaciosNiSeparadoresEnElNombreDelCliente',
        status: 'cancelled',
      }),
      order('3', { customerName: '', status: 'preparing' }),
      order('4', { status: 'pending' }),
    ],
  },
  { branchSlug: 'b', branchName: 'Norte', orders: [] },
  { branchSlug: 'c', branchName: 'Sur', orders: [] },
]

describe('grilla de pedidos con datos extremos', () => {
  const { withOrders, empty } = splitBranchesByActivity(branches)
  const html = renderToString(<OrdersGrid withOrders={withOrders} empty={empty} />)

  it('agrupa por sucursal y muestra el último pedido', () => {
    expect(html).toContain(LONG_BRANCH)
    expect(html).toContain('Último pedido')
    expect(html).not.toMatch(/Último pedido[^<]*<time[^>]*>Hace/)
  })

  it('lista aparte las sucursales sin pedidos', () => {
    expect(html).toContain('Sin pedidos registrados: Norte, Sur.')
  })

  it('no rompe con nombres largos, sin nombre ni importes enormes', () => {
    expect(html).toContain('Cliente sin nombre')
    expect(html).toContain(`title="${LONG_CUSTOMER}"`)
    expect(html).toContain('12.345.679')
    expect(html).toContain('truncate')
    expect(html).toContain('overflow-wrap:anywhere')
  })

  it('muestra todos los estados', () => {
    for (const label of ['Pendiente', 'En preparación', 'Entregado', 'Cancelado']) {
      expect(html).toContain(label)
    }
  })
})

describe('pedidos del Resumen', () => {
  const orders = ['1', '2', '3', '4', '5'].map((id) => order(id))

  it('muestra solo 3 pedidos y el enlace a todos', () => {
    const html = renderToString(
      <RecentOrders
        orders={orders}
        loading={false}
        showBranch
        limit={3}
        moreHref="/account/orders"
      />,
    )
    expect(html.match(/<li /g)).toHaveLength(3)
    expect(html).toContain('Ver todos los pedidos')
    expect(html).toContain('href="/account/orders"')
  })

  it('no ofrece el enlace cuando no hay pedidos', () => {
    const html = renderToString(
      <RecentOrders orders={[]} loading={false} showBranch limit={3} moreHref="/account/orders" />,
    )
    expect(html).toContain('Todavía no hay pedidos registrados.')
    expect(html).not.toContain('Ver todos')
  })
})
