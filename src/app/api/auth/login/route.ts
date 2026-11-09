import { NextResponse } from "next/server"

import { SESSION_COOKIE, sessionToken } from "@/lib/auth"
import { bump, clearFailures, clientKey, isLimited } from "@/lib/server/rate-limit"

/* Ten wrong passwords per client, two hundred in all, each within fifteen minutes. */
const PER_CLIENT = 10
const GLOBAL = 200

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
  clearFailures(key)

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
