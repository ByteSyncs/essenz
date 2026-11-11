export type ApiErrorKind =
  'session' | 'forbidden' | 'subscription' | 'invalid' | 'network' | 'server'

export interface ApiError {
  kind: ApiErrorKind
  code: string | null
}

export type Inflight = 'none' | 'background' | 'forced'

export interface Entry {
  data: unknown
  error: ApiError | null
  inflight: Inflight
  updatedAt: number
}

interface ApiBody {
  success?: boolean
  data?: unknown
  error?: unknown
}

interface StoreOptions {
  fetchFn?: typeof fetch
  now?: () => number
  ttlMs?: number
  maxEntries?: number
}

export const IDLE_ENTRY: Entry = Object.freeze({
  data: null,
  error: null,
  inflight: 'none',
  updatedAt: 0,
})

export function kindFor(status: number): ApiErrorKind {
  if (status === 401) return 'session'
  if (status === 403) return 'forbidden'
  if (status === 402) return 'subscription'
  if (status === 422) return 'invalid'
  return 'server'
}

export function createApiStore({
  fetchFn,
  now = Date.now,
  ttlMs = 30_000,
  maxEntries = 40,
}: StoreOptions = {}) {
  const entries = new Map<string, Entry>()
  const promises = new Map<string, Promise<void>>()
  const listeners = new Set<() => void>()

  function emit() {
    listeners.forEach((listener) => listener())
  }

  function getEntry(url: string): Entry {
    return entries.get(url) ?? IDLE_ENTRY
  }

  function patch(url: string, change: Partial<Entry>) {
    const next: Entry = { ...getEntry(url), ...change }
    entries.delete(url)
    entries.set(url, next)
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value
      if (oldest === undefined || oldest === url) break
      entries.delete(oldest)
    }
    emit()
  }

  async function run(url: string) {
    const doFetch = fetchFn ?? fetch
    try {
      const response = await doFetch(url, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      let body: ApiBody | null = null
      try {
        body = (await response.json()) as ApiBody
      } catch {
        body = null
      }
      if (!response.ok || !body?.success) {
        patch(url, {
          inflight: 'none',
          error: {
            kind: kindFor(response.status),
            code: typeof body?.error === 'string' ? body.error : null,
          },
        })
        return
      }
      patch(url, { inflight: 'none', error: null, data: body.data, updatedAt: now() })
    } catch {
      patch(url, { inflight: 'none', error: { kind: 'network', code: null } })
    }
  }

  function load(url: string, mode: 'background' | 'forced'): Promise<void> {
    const existing = promises.get(url)
    if (existing) {
      if (mode === 'forced' && getEntry(url).inflight === 'background') {
        patch(url, { inflight: 'forced' })
      }
      return existing
    }
    patch(url, { inflight: mode })
    const promise = run(url).finally(() => {
      promises.delete(url)
    })
    promises.set(url, promise)
    return promise
  }

  function isFresh(entry: Entry) {
    return entry.data !== null && entry.error === null && now() - entry.updatedAt <= ttlMs
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getEntry,
    load,
    ensure(url: string) {
      if (promises.has(url) || isFresh(getEntry(url))) return
      void load(url, 'background')
    },
    prefetch(url: string) {
      if (promises.has(url) || isFresh(getEntry(url))) return
      void load(url, 'background')
    },
    clear() {
      entries.clear()
      promises.clear()
      emit()
    },
    size: () => entries.size,
  }
}

export const apiStore = createApiStore()
