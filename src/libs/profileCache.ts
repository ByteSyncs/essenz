export type ProfileSnapshot = {
  role: string
  organizationSlug: string | null
  subscription: { status?: string | null; current_period_end?: string | null } | null
}

const TTL_MS = 20_000
const MAX_ENTRIES = 500
const cache = new Map<string, { value: ProfileSnapshot; expiresAt: number }>()

export function readProfileCache(userId: string) {
  const entry = cache.get(userId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(userId)
    return null
  }
  return entry.value
}

export function writeProfileCache(userId: string, value: ProfileSnapshot) {
  if (cache.size >= MAX_ENTRIES) cache.clear()
  cache.set(userId, { value, expiresAt: Date.now() + TTL_MS })
}

export function invalidateProfileCache(userId: string) {
  cache.delete(userId)
}
