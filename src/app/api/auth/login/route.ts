import { NextResponse } from "next/server"

import { SESSION_COOKIE, sessionToken } from "@/lib/auth"

/*
 * Failed logins are counted per client address, and globally as a backstop
 * for spoofed forwarding headers. In-memory on purpose: one process, one
 * instance, and a restart clearing the counters is fine.
 */
const WINDOW_MS = 15 * 60 * 1000
const PER_CLIENT = 10
const GLOBAL = 200
const failures = new Map<string, { count: number; resetAt: number }>()

function bump(key: string, limit: number): boolean {
  const now = Date.now()
  const entry = failures.get(key)
  if (!entry || entry.resetAt < now) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > limit
}

function isLimited(key: string, limit: number): boolean {
  const entry = failures.get(key)
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= limit)
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip") || "direct"
}

export async function POST(request: Request) {
  const password = process.env.CVFREE_PASSWORD || ""
  const body = (await request.json().catch(() => ({}))) as { password?: string }
  if (!password) return NextResponse.json({ ok: true })

  const key = clientKey(request)
  if (isLimited(key, PER_CLIENT) || isLimited("*", GLOBAL)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 })
  }
  if (body.password !== password) {
    bump(key, PER_CLIENT)
    bump("*", GLOBAL)
    await new Promise((r) => setTimeout(r, 600))
    return NextResponse.json({ error: "Wrong password" }, { status: 401 })
  }
  failures.delete(key)

  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https" || request.url.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
