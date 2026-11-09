import { NextResponse, type NextRequest } from "next/server"

import { isValidSession, SESSION_COOKIE } from "@/lib/auth"

// /s/<token> is the public read-only link. The token is the whole secret.
// /mcp checks its own bearer token in the route, since MCP clients have no cookie.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health", "/s", "/api/s", "/mcp"]

export async function proxy(request: NextRequest) {
  const password = process.env.CVFREE_PASSWORD || ""
  if (!password) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  const ok = await isValidSession(request.cookies.get(SESSION_COOKIE)?.value, password)
  if (ok) return NextResponse.next()

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|woff2?|css|js)$).*)"],
}
