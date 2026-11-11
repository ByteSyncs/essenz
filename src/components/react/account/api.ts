import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { IDLE_ENTRY, apiStore, type ApiError, type ApiErrorKind } from './store'

export type { ApiError, ApiErrorKind }

export interface ApiResult<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
  refreshing: boolean
  reload: () => void
}

export function prefetchApi(url: string) {
  apiStore.prefetch(url)
}

export function useApi<T>(url: string | null): ApiResult<T> {
  const entry = useSyncExternalStore(
    apiStore.subscribe,
    () => (url === null ? IDLE_ENTRY : apiStore.getEntry(url)),
    () => IDLE_ENTRY,
  )

  const lastData = useRef<T | null>(null)
  if (url !== null && entry.data !== null) lastData.current = entry.data as T

  useEffect(() => {
    if (url !== null) apiStore.ensure(url)
  }, [url])

  const ownData = url === null ? null : (entry.data as T | null)
  const data = ownData ?? lastData.current
  const showingPrevious = ownData === null && lastData.current !== null

  const reload = useCallback(() => {
    if (url !== null) void apiStore.load(url, 'forced')
  }, [url])

  return {
    data,
    error: url === null ? null : entry.error,
    loading: data === null && (url === null || entry.error === null),
    refreshing:
      data !== null &&
      ((entry.inflight === 'forced' && !showingPrevious) ||
        (showingPrevious && entry.inflight !== 'none')),
    reload,
  }
}
