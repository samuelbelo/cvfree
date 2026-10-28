import { NextResponse } from "next/server"

import { htmlToText } from "@/lib/resume/format"

export const runtime = "nodejs"

/** Fetch a job posting URL and return its readable text for the Tailor tab. */
export async function POST(request: Request) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string }
  let target: URL
  try {
    target = new URL(url ?? "")
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }
  if (!/^https?:$/.test(target.protocol)) return NextResponse.json({ error: "Only http and https links" }, { status: 400 })
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\])/.test(target.hostname)) {
    return NextResponse.json({ error: "Private addresses are not allowed" }, { status: 400 })
  }
  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; cvfree/0.1)", Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    })
    if (!res.ok) return NextResponse.json({ error: `The page answered ${res.status}` }, { status: 502 })
    const html = (await res.text()).slice(0, 2_000_000)
    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<(nav|footer|header|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? ""
    const text = htmlToText(body).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim()
    return NextResponse.json({ title: htmlToText(title), text: text.slice(0, 20_000) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fetch failed" }, { status: 502 })
  }
}
