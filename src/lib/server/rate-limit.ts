import "server-only"

/*
 * Failed attempts are counted per client address, and globally as a backstop
 * for spoofed forwarding headers. In-memory on purpose: one process, one
 * instance, and a restart clearing the counters is fine. Shared by the login
 * form and the MCP endpoint.
 */
const WINDOW_MS = 15 * 60 * 1000
const failures = new Map<string, { count: number; resetAt: number }>()

/** Count one failure. Returns true once the key is over its limit. */
export function bump(key: string, limit: number): boolean {
  const now = Date.now()
  const entry = failures.get(key)
  if (!entry || entry.resetAt < now) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > limit
}

export function isLimited(key: string, limit: number): boolean {
  const entry = failures.get(key)
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= limit)
}

export function clearFailures(key: string) {
  failures.delete(key)
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip") || "direct"
}
