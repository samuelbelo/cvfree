import { NextResponse } from "next/server"

import { config } from "@/lib/server/config"
import { handleMcpRequest } from "@/lib/server/mcp"
import { bump, clearFailures, clientKey, isLimited } from "@/lib/server/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

/*
 * The MCP endpoint. Three states:
 *   - CVFREE_MCP_TOKEN set: every request needs "Authorization: Bearer <token>".
 *   - no token, no password: open, like the rest of the API on a private install.
 *   - no token, password set: off, so the password is never bypassed.
 * Wrong tokens are rate limited the same way wrong passwords are.
 */
const PER_CLIENT = 10
const GLOBAL = 200

function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const unauthorized = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { "WWW-Authenticate": 'Bearer realm="cvfree"' } })

async function handle(request: Request) {
  const token = config.mcpToken
  if (!token) {
    if (config.password) {
      return NextResponse.json({ error: "MCP is off. Set CVFREE_MCP_TOKEN to turn it on." }, { status: 404 })
    }
  } else {
    const key = clientKey(request)
    if (isLimited(key, PER_CLIENT) || isLimited("*", GLOBAL)) {
      return unauthorized("Too many attempts. Try again in a few minutes.", 429)
    }
    const presented = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim()
    if (!presented || !sameSecret(presented, token)) {
      bump(key, PER_CLIENT)
      bump("*", GLOBAL)
      return unauthorized("A valid bearer token is required.", 401)
    }
    clearFailures(key)
  }
  return handleMcpRequest(request)
}

export const GET = handle
export const POST = handle
export const DELETE = handle
