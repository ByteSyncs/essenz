import { renderToString as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { groupAttentionByBranch } from '../../../libs/account/attention'
import type { AttentionItem } from '../../../types/account'
import { AttentionList } from './ActivityPanels'
import { AttentionGrid } from './AttentionView'

const renderToString = (node: Parameters<typeof render>[0]) =>
  render(node).replaceAll('<!-- -->', '')

const LONG_NAME =
  'Panadería y Confitería Los Hermanos Fernández-Montenegro Sucursal Centro Histórico'
const UNBROKEN = 'SucursalDeLaZonaNorteDelGranBuenosAiresSanIsidroOeste'

function item(
  slug: string,
  name: string,
  kind: AttentionItem['kind'],
  message: string,
): AttentionItem {
  return {
    id: `${slug}:${kind}`,
    kind,
    branchSlug: slug,
    branchName: name,
    message,
    actionLabel: 'Ver inventario',
    actionHref: `/${slug}/admin/dashboard?view=inventory`,
  }
}

const branches = [
  { slug: 'a', name: LONG_NAME },
  { slug: 'b', name: UNBROKEN },
  { slug: 'c', name: 'Sur' },
  { slug: 'd', name: 'Norte' },
]

const items: AttentionItem[] = [
  item(
    'a',
    LONG_NAME,
    'menu_inactive',
    'La carta pública está desactivada y los clientes no pueden verla.',
  ),
  item('a', LONG_NAME, 'low_stock', '1.284 insumos están en el stock mínimo o por debajo.'),
  item('a', LONG_NAME, 'product_limit', 'Usa 990 de 1000 productos que permite el plan.'),
  item('a', LONG_NAME, 'no_orders', 'No registró pedidos en los últimos 30 días.'),
  item(
    'a',
    LONG_NAME,
    'no_contact',
    'Faltan la dirección y los datos de contacto en el sitio público.',
  ),
  item('b', UNBROKEN, 'low_stock', '1 insumo está en el stock mínimo o por debajo.'),
]

describe('grilla de atención con datos extremos', () => {
  const { withItems, clean } = groupAttentionByBranch(branches, items)
  const html = renderToString(<AttentionGrid withItems={withItems} clean={clean} />)

  it('ordena las sucursales con más avisos primero', () => {
    expect(html.indexOf(LONG_NAME)).toBeLessThan(html.indexOf(UNBROKEN))
  })

  it('pluraliza bien: 5 avisos y 1 aviso', () => {
    expect(html).toContain('5 avisos')
    expect(html).toContain('1 aviso<')
    expect(html).not.toContain('1 avisos')
  })

  it('deja que los nombres largos se corten en cualquier punto', () => {
    expect(html.match(/overflow-wrap:anywhere/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('lista aparte las sucursales sin avisos', () => {
    expect(html).toContain('Sin avisos: Sur, Norte.')
  })

  it('cada enlace dice a qué sucursal pertenece para lectores de pantalla', () => {
    expect(html).toContain(`<span class="sr-only"> en ${UNBROKEN}</span>`)
  })
})

describe('lista del Resumen', () => {
  it('muestra solo 3 avisos y enlaza a la sección completa', () => {
    const html = renderToString(
      <AttentionList
        items={items}
        loading={false}
        showBranch
        limit={3}
        moreHref="/account/attention"
      />,
    )
    expect(html).toContain('Ver los 6 avisos')
    expect(html).toContain('href="/account/attention"')
    expect(html.match(/<li /g)).toHaveLength(3)
  })

  it('no muestra el enlace cuando todo entra', () => {
    const html = renderToString(
      <AttentionList
        items={items.slice(0, 3)}
        loading={false}
        showBranch
        limit={3}
        moreHref="/account/attention"
      />,
    )
    expect(html).not.toContain('Ver los')
  })
})
