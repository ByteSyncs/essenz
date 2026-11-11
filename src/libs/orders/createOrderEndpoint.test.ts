import { beforeEach, describe, expect, it, vi } from 'vitest'

interface QueryState {
  table: string
  op: 'select' | 'insert'
  filters: Array<[string, unknown]>
  payload?: Record<string, unknown>
}

const state = vi.hoisted(() => ({
  queries: [] as QueryState[],
  responder: (_query: QueryState): { data: unknown; error: unknown } => ({
    data: null,
    error: null,
  }),
}))

vi.mock('../supabaseAdmin', () => ({
  default: {
    from(table: string) {
      const query: QueryState = { table, op: 'select', filters: [] }
      const run = () => {
        state.queries.push({ ...query, filters: [...query.filters] })
        return Promise.resolve(state.responder(query))
      }
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          query.filters.push([column, value])
          return builder
        },
        in: (column: string, value: unknown) => {
          query.filters.push([column, value])
          return builder
        },
        insert: (payload: Record<string, unknown>) => {
          query.op = 'insert'
          query.payload = payload
          return builder
        },
        maybeSingle: run,
        single: run,
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          run().then(resolve, reject),
      }
      return builder
    },
  },
}))

vi.mock('@sentry/astro', () => ({ captureException: vi.fn() }))

import { POST } from '../../pages/api/organizations/[slug]/orders/index'

const ORDER_ID = '3f2b9c1e-8a4d-4e6f-9b1a-0c5d7e2f4a61'
const PRODUCT_A = '11111111-1111-4111-8111-111111111111'

let slugCounter = 0
const nextSlug = () => `cafe-${(slugCounter += 1)}`

const call = (slug: string, body: unknown) =>
  POST({
    params: { slug },
    request: new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }),
  } as unknown as Parameters<typeof POST>[0])

const validBody = (extra: Record<string, unknown> = {}) => ({
  customer_name: 'Ana',
  items: [{ id: PRODUCT_A, qty: 2 }],
  payments: [{ method: 'debit' }],
  ...extra,
})

const insertQueries = () => state.queries.filter((query) => query.op === 'insert')

beforeEach(() => {
  state.queries = []
  state.responder = (query) => {
    if (query.table === 'organizations') return { data: { id: 'org-1' }, error: null }
    if (query.table === 'products') {
      return {
        data: [
          { id: PRODUCT_A, name: 'Espresso', price: 2500, in_offer: false, offer_percent: null },
        ],
        error: null,
      }
    }
    if (query.table === 'orders' && query.op === 'insert') {
      return { data: { ...query.payload, created_at: '2026-11-06T20:00:00Z' }, error: null }
    }
    return { data: null, error: null }
  }
})

describe('POST /orders', () => {
  it('guarda el pedido con el id que mandó la pantalla', async () => {
    const response = await call(nextSlug(), validBody({ id: ORDER_ID }))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.id).toBe(ORDER_ID)
    expect(insertQueries()[0].payload).toMatchObject({ id: ORDER_ID, total_price: 5000 })
  })

  it('sin id deja que la base lo genere', async () => {
    const response = await call(nextSlug(), validBody())
    expect(response.status).toBe(201)
    expect(insertQueries()[0].payload).not.toHaveProperty('id')
  })

  it('ignora un id con formato inválido', async () => {
    await call(nextSlug(), validBody({ id: 'no-es-uuid' }))
    expect(insertQueries()[0].payload).not.toHaveProperty('id')
  })

  it('el precio sale siempre del servidor, nunca de la pantalla', async () => {
    await call(
      nextSlug(),
      validBody({ id: ORDER_ID, items: [{ id: PRODUCT_A, qty: 1, price: 1 }] }),
    )
    expect(insertQueries()[0].payload).toMatchObject({ total_price: 2500 })
  })

  it('un reintento con el mismo id devuelve el pedido ya guardado', async () => {
    const existing = { id: ORDER_ID, org_slug: 'x', customer_name: 'Ana' }
    const slug = nextSlug()
    state.responder = (query) => {
      if (query.table === 'organizations') return { data: { id: 'org-1' }, error: null }
      if (query.table === 'products') {
        return {
          data: [
            { id: PRODUCT_A, name: 'Espresso', price: 2500, in_offer: false, offer_percent: null },
          ],
          error: null,
        }
      }
      if (query.op === 'insert') return { data: null, error: { code: '23505' } }
      return { data: existing, error: null }
    }
    const response = await call(slug, validBody({ id: ORDER_ID }))
    expect(response.status).toBe(200)
    expect((await response.json()).data).toEqual(existing)
    const lookup = state.queries.at(-1)!
    expect(lookup.filters).toContainEqual(['org_slug', slug])
    expect(lookup.filters).toContainEqual(['id', ORDER_ID])
  })

  it('un id que ya existe en otra sucursal no se expone: responde conflicto', async () => {
    state.responder = (query) => {
      if (query.table === 'organizations') return { data: { id: 'org-1' }, error: null }
      if (query.table === 'products') {
        return {
          data: [
            { id: PRODUCT_A, name: 'Espresso', price: 2500, in_offer: false, offer_percent: null },
          ],
          error: null,
        }
      }
      if (query.op === 'insert') return { data: null, error: { code: '23505' } }
      return { data: null, error: null }
    }
    const response = await call(nextSlug(), validBody({ id: ORDER_ID }))
    expect(response.status).toBe(409)
    expect((await response.json()).error).toBe('order_conflict')
  })

  it('un error de la base que no es duplicado sigue siendo 500', async () => {
    const base = state.responder
    state.responder = (query) =>
      query.op === 'insert' ? { data: null, error: { code: '08006' } } : base(query)
    const response = await call(nextSlug(), validBody({ id: ORDER_ID }))
    expect(response.status).toBe(500)
  })

  it('consulta la sucursal una sola vez para pedidos seguidos', async () => {
    const slug = nextSlug()
    await call(slug, validBody({ id: ORDER_ID }))
    await call(slug, validBody({ id: '4f2b9c1e-8a4d-4e6f-9b1a-0c5d7e2f4a62' }))
    const lookups = state.queries.filter((query) => query.table === 'organizations')
    expect(lookups).toHaveLength(1)
    expect(insertQueries()).toHaveLength(2)
  })

  it('una sucursal inexistente responde 404 y no se guarda en caché', async () => {
    state.responder = () => ({ data: null, error: null })
    const response = await call(nextSlug(), validBody())
    expect(response.status).toBe(404)
  })

  it('rechaza productos que no existen o están inactivos', async () => {
    const base = state.responder
    state.responder = (query) =>
      query.table === 'products' ? { data: [], error: null } : base(query)
    const response = await call(nextSlug(), validBody())
    expect(response.status).toBe(422)
    expect((await response.json()).error).toBe('invalid_items')
    expect(insertQueries()).toHaveLength(0)
  })

  it('mantiene la validación del efectivo recibido', async () => {
    const response = await call(
      nextSlug(),
      validBody({ payments: [{ method: 'cash' }], cash_given: 100 }),
    )
    expect(response.status).toBe(422)
    expect((await response.json()).error).toBe('cash_insufficient')
  })

  it('acepta Mercado Pago como medio independiente', async () => {
    const response = await call(nextSlug(), validBody({ payments: [{ method: 'mercadopago' }] }))
    expect(response.status).toBe(201)
    expect(insertQueries()[0].payload).toMatchObject({
      payments: [{ method: 'mercadopago', amount: 5000 }],
    })
  })

  it('registra la propina por separado y la asigna a efectivo por defecto', async () => {
    const response = await call(
      nextSlug(),
      validBody({
        tip_amount: 500,
        payments: [{ method: 'cash' }],
        cash_given: 5500,
      }),
    )
    expect(response.status).toBe(201)
    expect(insertQueries()[0].payload).toMatchObject({
      payments: [{ method: 'cash', amount: 5000 }],
      tip_amount: 500,
      tip_payment_method: 'cash',
      tip_included_in_payments: false,
    })
  })

  it('valida el efectivo de una propina aunque la venta se pague sin efectivo', async () => {
    const response = await call(
      nextSlug(),
      validBody({
        tip_amount: 500,
        tip_payment_method: 'cash',
        cash_given: 499,
      }),
    )
    expect(response.status).toBe(422)
    expect((await response.json()).error).toBe('cash_insufficient')
  })

  it('acepta el split del total de venta y guarda la propina en otro medio', async () => {
    const response = await call(
      nextSlug(),
      validBody({
        tip_amount: 500,
        tip_payment_method: 'mercadopago',
        payments: [
          { method: 'cash', amount: 3000 },
          { method: 'debit', amount: 2000 },
        ],
        cash_given: 3000,
      }),
    )
    expect(response.status).toBe(201)
    expect(insertQueries()[0].payload).toMatchObject({
      tip_payment_method: 'mercadopago',
      tip_included_in_payments: false,
    })
  })

  it('rechaza medios de propina que no estén permitidos', async () => {
    const response = await call(
      nextSlug(),
      validBody({ tip_payment_method: 'cripto', tip_amount: 100 }),
    )
    expect(response.status).toBe(422)
    expect((await response.json()).error).toBe('invalid_tip_payment_method')
  })

  it('sigue rechazando métodos de pago desconocidos', async () => {
    const response = await call(
      nextSlug(),
      validBody({ payments: [{ method: 'metodo-desconocido' }] }),
    )
    expect(response.status).toBe(422)
    expect((await response.json()).error).toBe('invalid_payments')
    expect(insertQueries()).toHaveLength(0)
  })
})
