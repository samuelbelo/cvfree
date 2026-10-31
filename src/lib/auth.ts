/*
 * Optional single-password gate. When CVFREE_PASSWORD is set, the session
 * cookie holds an HMAC of the password, so changing the password logs
 * everyone out. Uses Web Crypto so it runs in the proxy and in route handlers.
 */

export const SESSION_COOKIE = "cvfree_session"

export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("cvfree-session-v1"))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function isValidSession(cookieValue: string | undefined, password: string) {
  if (!password) return true
  if (!cookieValue) return false
  const expected = await sessionToken(password)
  if (expected.length !== cookieValue.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ cookieValue.charCodeAt(i)
  return diff === 0
}
