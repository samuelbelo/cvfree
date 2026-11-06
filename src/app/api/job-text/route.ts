import { NextResponse } from "next/server"

import { htmlToText } from "@/lib/resume/format"
import { fetchPublicPage } from "@/lib/server/safe-fetch"

export const runtime = "nodejs"

/** Fetch a job posting URL and return its readable text for the Tailor tab. */
export async function POST(request: Request) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string }
  let page
  try {
    page = await fetchPublicPage(url ?? "")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch failed"
    const policy = /not allowed|Invalid URL|Only http/.test(message)
    return NextResponse.json({ error: message }, { status: policy ? 400 : 502 })
  }
  if (page.status < 200 || page.status >= 300) {
    return NextResponse.json({ error: `The page answered ${page.status}` }, { status: 502 })
  }
  if (page.contentType && !/html|xml|text\/plain/i.test(page.contentType)) {
    return NextResponse.json({ error: "That link is not a web page. Paste the posting text instead." }, { status: 400 })
  }
  const html = page.body
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|footer|header|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? ""
  const text = htmlToText(body).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim()
  return NextResponse.json({ title: htmlToText(title), text: text.slice(0, 20_000) })
}
