const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 8
const MAX_ENTRIES = 2000

const attempts = new Map<string, { count: number; resetAt: number }>()

export function isRateLimited(key: string, now = Date.now()) {
  const entry = attempts.get(key)
  if (!entry) return false
  if (entry.resetAt <= now) {
    attempts.delete(key)
    return false
  }
  return entry.count >= MAX_ATTEMPTS
}

export function recordFailure(key: string, now = Date.now()) {
  if (attempts.size >= MAX_ENTRIES) attempts.clear()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  entry.count += 1
}

export function clearFailures(key: string) {
  attempts.delete(key)
}
