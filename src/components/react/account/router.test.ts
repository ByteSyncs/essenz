import { describe, expect, it } from 'vitest'
import { ACCOUNT_ROUTES, resolveRoute, routeForAnchor, shouldHandleClick } from './router'

function click(overrides: Record<string, unknown> = {}) {
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    currentTarget: { target: null, hasAttribute: () => false },
    ...overrides,
  } as Parameters<typeof shouldHandleClick>[0]
}

describe('resolveRoute', () => {
  it('finds each section, ignoring trailing slashes', () => {
    for (const route of ACCOUNT_ROUTES) {
      expect(resolveRoute(route.path).id).toBe(route.id)
      expect(resolveRoute(`${route.path}/`).id).toBe(route.id)
    }
  })

  it('falls back to the overview for unknown paths', () => {
    expect(resolveRoute('/account/nada').id).toBe('overview')
    expect(resolveRoute('/').id).toBe('overview')
  })

  it('has unique paths and titles', () => {
    expect(new Set(ACCOUNT_ROUTES.map((route) => route.path)).size).toBe(ACCOUNT_ROUTES.length)
    expect(new Set(ACCOUNT_ROUTES.map((route) => route.title)).size).toBe(ACCOUNT_ROUTES.length)
  })
})

describe('shouldHandleClick', () => {
  it('handles a plain left click', () => {
    expect(shouldHandleClick(click())).toBe(true)
  })

  it('leaves the browser alone for new-tab gestures and other buttons', () => {
    expect(shouldHandleClick(click({ ctrlKey: true }))).toBe(false)
    expect(shouldHandleClick(click({ metaKey: true }))).toBe(false)
    expect(shouldHandleClick(click({ shiftKey: true }))).toBe(false)
    expect(shouldHandleClick(click({ altKey: true }))).toBe(false)
    expect(shouldHandleClick(click({ button: 1 }))).toBe(false)
    expect(shouldHandleClick(click({ defaultPrevented: true }))).toBe(false)
  })

  it('leaves target and download links alone', () => {
    expect(shouldHandleClick(click({ currentTarget: { target: '_blank' } }))).toBe(false)
    expect(
      shouldHandleClick(click({ currentTarget: { target: null, hasAttribute: () => true } })),
    ).toBe(false)
  })
})

describe('routeForAnchor', () => {
  const origin = 'https://essenz.example'
  const anchor = (pathname: string, extra: Record<string, string> = {}) => ({
    origin,
    pathname,
    search: '',
    hash: '',
    ...extra,
  })

  it('reconoce los enlaces internos a las secciones del panel', () => {
    expect(routeForAnchor(anchor('/account/orders'), origin)?.id).toBe('orders')
    expect(routeForAnchor(anchor('/account/orders/'), origin)?.id).toBe('orders')
    expect(routeForAnchor(anchor('/account'), origin)?.id).toBe('overview')
  })

  it('ignora enlaces de otra sucursal, otro sitio, con búsqueda o ancla', () => {
    expect(routeForAnchor(anchor('/centro/admin/dashboard'), origin)).toBeNull()
    expect(
      routeForAnchor(anchor('/account/orders', { origin: 'https://otro.example' }), origin),
    ).toBeNull()
    expect(routeForAnchor(anchor('/account', { search: '?range=7d' }), origin)).toBeNull()
    expect(routeForAnchor(anchor('/account', { hash: '#contenido' }), origin)).toBeNull()
    expect(routeForAnchor(anchor('/account/otra'), origin)).toBeNull()
  })
})
