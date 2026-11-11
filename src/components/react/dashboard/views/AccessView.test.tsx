import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { STAFF_VIEWS, OWNER_VIEWS, viewsForRole, defaultViewForRole } from '../dashboardViews'
import BranchAccessForm from '../../staff/BranchAccessForm'
import Sidebar from '../Sidebar'

describe('vistas por rol', () => {
  it('el personal trabaja el turno y no ve el acceso ni el inicio del dueño', () => {
    expect(STAFF_VIEWS).toEqual([
      'orders',
      'sales',
      'cash',
      'menu',
      'inventory',
      'expenses',
      'statistics',
      'qr',
      'settings',
    ])
    expect(STAFF_VIEWS).not.toContain('access')
    expect(STAFF_VIEWS).not.toContain('home')
  })

  it('el dueño no ve pedidos ni gastos', () => {
    expect(OWNER_VIEWS).not.toContain('orders')
    expect(OWNER_VIEWS).not.toContain('expenses')
    expect(OWNER_VIEWS).toContain('access')
  })

  it('cada rol abre en su vista principal', () => {
    expect(defaultViewForRole(true)).toBe('home')
    expect(defaultViewForRole(false)).toBe('orders')
    expect(viewsForRole(false)).toBe(STAFF_VIEWS)
  })
})

describe('navegación', () => {
  const noop = () => undefined

  it('muestra al personal solo sus secciones y el cierre de sesión', () => {
    const html = renderToString(
      <Sidebar active="orders" onNav={noop} slug="centro" isOwner={false} />,
    )
    expect(html).toContain('Pedidos')
    expect(html).toContain('Ventas')
    expect(html).toContain('Gastos')
    expect(html).toContain('Cerrar sesión del turno')
    expect(html).not.toContain('Acceso del personal')
    expect(html).not.toContain('Equipo')
  })

  it('muestra al dueño sin pedidos ni gastos', () => {
    const html = renderToString(<Sidebar active="home" onNav={noop} slug="centro" isOwner />)
    expect(html).toContain('Acceso del personal')
    expect(html).not.toContain('Pedidos')
    expect(html).toContain('Ventas')
    expect(html).not.toContain('Gastos')
    expect(html).not.toContain('Cerrar sesión del turno')
  })
})

describe('formulario de acceso', () => {
  it('pide la contraseña con etiqueta y nombra la sucursal', () => {
    const html = renderToString(
      <BranchAccessForm token="3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b" name="Café Centro" />,
    )
    expect(html).toContain('Contraseña del turno')
    expect(html).toContain('Ingresar a Café Centro')
    expect(html).toContain('autoComplete="current-password"')
  })
})
