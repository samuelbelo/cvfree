import { NextResponse } from "next/server"

import { SESSION_COOKIE, sessionToken } from "@/lib/auth"

export async function POST(request: Request) {
  const password = process.env.CVFREE_PASSWORD || ""
  const body = (await request.json().catch(() => ({}))) as { password?: string }
  if (!password) return NextResponse.json({ ok: true })
  if (body.password !== password) {
    await new Promise((r) => setTimeout(r, 600))
    return NextResponse.json({ error: "Wrong password" }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
