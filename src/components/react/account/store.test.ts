import { describe, expect, it, vi } from 'vitest'
import { createApiStore, kindFor } from './store'

function reply(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

function setup(responses: (url: string) => Response | Promise<Response>) {
  let clock = 1_000
  const fetchFn = vi.fn(async (url: string | URL | Request) => responses(String(url)))
  const store = createApiStore({
    fetchFn: fetchFn as unknown as typeof fetch,
    now: () => clock,
    ttlMs: 30_000,
    maxEntries: 3,
  })
  return { store, fetchFn, tick: (ms: number) => (clock += ms) }
}

describe('kindFor', () => {
  it('maps HTTP statuses to error kinds', () => {
    expect(kindFor(401)).toBe('session')
    expect(kindFor(403)).toBe('forbidden')
    expect(kindFor(402)).toBe('subscription')
    expect(kindFor(422)).toBe('invalid')
    expect(kindFor(500)).toBe('server')
  })
})

describe('api store', () => {
  it('shares one request between simultaneous consumers', async () => {
    const { store, fetchFn } = setup(() => reply({ success: true, data: { a: 1 } }))
    store.ensure('/x')
    store.ensure('/x')
    await store.load('/x', 'background')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(store.getEntry('/x').data).toEqual({ a: 1 })
  })

  it('serves fresh data without asking the server again', async () => {
    const { store, fetchFn, tick } = setup(() => reply({ success: true, data: 1 }))
    await store.load('/x', 'background')
    tick(10_000)
    store.ensure('/x')
    store.prefetch('/x')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('revalidates in the background once the data is stale, keeping the old data meanwhile', async () => {
    const { store, fetchFn, tick } = setup(() => reply({ success: true, data: 'nuevo' }))
    await store.load('/x', 'background')
    tick(31_000)
    store.ensure('/x')
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(store.getEntry('/x').data).toBe('nuevo')
    expect(store.getEntry('/x').inflight).toBe('background')
  })

  it('forces a reload even when the data is fresh and flags it', async () => {
    const { store, fetchFn } = setup(() => reply({ success: true, data: 1 }))
    await store.load('/x', 'background')
    const pending = store.load('/x', 'forced')
    expect(store.getEntry('/x').inflight).toBe('forced')
    await pending
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(store.getEntry('/x').inflight).toBe('none')
  })

  it('upgrades an in-flight background request to forced without a second request', async () => {
    const { store, fetchFn } = setup(() => reply({ success: true, data: 1 }))
    const first = store.load('/x', 'background')
    const second = store.load('/x', 'forced')
    expect(store.getEntry('/x').inflight).toBe('forced')
    await Promise.all([first, second])
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('keeps the last good data when a refresh fails, and reports the error', async () => {
    let fail = false
    const { store } = setup(() =>
      fail ? reply({ success: false, error: 'boom' }, 500) : reply({ success: true, data: 'ok' }),
    )
    await store.load('/x', 'background')
    fail = true
    await store.load('/x', 'forced')
    const entry = store.getEntry('/x')
    expect(entry.data).toBe('ok')
    expect(entry.error).toEqual({ kind: 'server', code: 'boom' })
    fail = false
    await store.load('/x', 'forced')
    expect(store.getEntry('/x').error).toBeNull()
  })

  it('classifies network failures and unreadable bodies', async () => {
    const down = setup(() => Promise.reject(new Error('offline')))
    await down.store.load('/x', 'background')
    expect(down.store.getEntry('/x').error?.kind).toBe('network')

    const broken = setup(
      () =>
        ({
          ok: false,
          status: 401,
          json: async () => Promise.reject(new Error('x')),
        }) as unknown as Response,
    )
    await broken.store.load('/x', 'background')
    expect(broken.store.getEntry('/x').error?.kind).toBe('session')
  })

  it('retries a failed request on the next ensure instead of caching the failure', async () => {
    let fail = true
    const { store, fetchFn } = setup(() =>
      fail ? reply({ success: false }, 500) : reply({ success: true, data: 2 }),
    )
    await store.load('/x', 'background')
    fail = false
    store.ensure('/x')
    await store.load('/x', 'background')
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(store.getEntry('/x').data).toBe(2)
  })

  it('does not grow without bound', async () => {
    const { store } = setup(() => reply({ success: true, data: 1 }))
    for (const url of ['/a', '/b', '/c', '/d', '/e']) await store.load(url, 'background')
    expect(store.size()).toBe(3)
    expect(store.getEntry('/a').data).toBeNull()
    expect(store.getEntry('/e').data).toBe(1)
  })

  it('notifies subscribers on every change and stops after unsubscribe', async () => {
    const { store } = setup(() => reply({ success: true, data: 1 }))
    const listener = vi.fn()
    const off = store.subscribe(listener)
    await store.load('/x', 'background')
    expect(listener).toHaveBeenCalledTimes(2)
    off()
    await store.load('/y', 'background')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
