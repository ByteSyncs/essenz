import { renderToString as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AccountApp from './AccountApp'
import { ACCOUNT_ROUTES } from './router'

const renderToString = (node: Parameters<typeof render>[0]) =>
  render(node).replaceAll('<!-- -->', '')

describe('AccountApp en el servidor', () => {
  it('marca la sección actual y no deja ninguna otra marcada', () => {
    for (const route of ACCOUNT_ROUTES) {
      const html = renderToString(<AccountApp initialPath={route.path} />)
      expect(html.match(/aria-current="page"/g)).toHaveLength(1)
      expect(html).toMatch(new RegExp(`href="${route.path}"[^>]*aria-current="page"`))
      expect(html).toContain(`aria-label="${route.label}"`)
    }
  })

  it('lista las cinco secciones con enlaces reales', () => {
    const html = renderToString(<AccountApp initialPath="/account" />)
    for (const route of ACCOUNT_ROUTES) {
      expect(html).toContain(`href="${route.path}"`)
      expect(html).toContain(route.label)
    }
  })

  it('arma el contenido principal, accesible por teclado y enlazado desde el salto', () => {
    const html = renderToString(<AccountApp initialPath="/account/orders" />)
    expect(html).toContain('id="contenido"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('aria-busy="true"')
  })

  it('cae en el Resumen con una ruta desconocida', () => {
    const html = renderToString(<AccountApp initialPath="/account/otra-cosa/" />)
    expect(html).toMatch(/href="\/account"[^>]*aria-current="page"/)
  })
})
