import { describe, expect, it, vi } from 'vitest'
import { GENERIC_MESSAGE, NETWORK_MESSAGE, ORDER_ERROR_MESSAGES, saveOrder } from './saveOrder'

const order = { id: 'o1', org_slug: 'cafe' }
const reply = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response

const run = (responses: Array<Response | Error>) => {
  const fetchFn = vi.fn(async () => {
    const next = responses.shift()
    if (next instanceof Error) throw next
    return next as Response
  })
  const sleep = vi.fn(async () => undefined)
  const promise = saveOrder({
    slug: 'cafe',
    payload: { id: 'o1' },
    fetchFn: fetchFn as unknown as typeof fetch,
    sleep,
  })
  return { promise, fetchFn, sleep }
}

describe('saveOrder', () => {
  it('devuelve el pedido guardado sin reintentar', async () => {
    const { promise, fetchFn } = run([reply(201, { success: true, data: order })])
    expect(await promise).toEqual({ ok: true, order })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('reintenta ante un corte de red y termina guardando', async () => {
    const { promise, fetchFn, sleep } = run([
      new Error('offline'),
      reply(502, {}),
      reply(200, { success: true, data: order }),
    ])
    expect(await promise).toEqual({ ok: true, order })
    expect(fetchFn).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenNthCalledWith(1, 800)
    expect(sleep).toHaveBeenNthCalledWith(2, 2000)
  })

  it('tras agotar reintentos informa falta de conexión', async () => {
    const { promise, fetchFn } = run([new Error('a'), new Error('b'), new Error('c')])
    expect(await promise).toEqual({ ok: false, message: NETWORK_MESSAGE })
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('no reintenta los errores de validación y muestra su mensaje', async () => {
    const { promise, fetchFn } = run([reply(422, { success: false, error: 'invalid_items' })])
    expect(await promise).toEqual({ ok: false, message: ORDER_ERROR_MESSAGES.invalid_items })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('usa un mensaje genérico ante errores desconocidos', async () => {
    const { promise } = run([reply(400, { success: false, error: 'raro' })])
    expect(await promise).toEqual({ ok: false, message: GENERIC_MESSAGE })
  })

  it('trata una respuesta exitosa sin pedido como error', async () => {
    const { promise } = run([reply(200, { success: true })])
    expect(await promise).toEqual({ ok: false, message: GENERIC_MESSAGE })
  })

  it('manda siempre el mismo cuerpo, con el mismo id', async () => {
    const { promise, fetchFn } = run([new Error('x'), reply(201, { data: order })])
    await promise
    const bodies = fetchFn.mock.calls.map(
      (call) => (call as unknown as [string, RequestInit])[1].body,
    )
    expect(bodies[0]).toBe(bodies[1])
  })
})
