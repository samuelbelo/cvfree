import "server-only"

import { htmlToText } from "@/lib/resume/format"

import { fetchPublicPage } from "./safe-fetch"

/** Thrown with the HTTP status the API should answer with. */
export class JobTextError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

/** Fetch a job posting URL and return its readable text. Used by the Tailor tab and the MCP server. */
export async function readJobPosting(url: string): Promise<{ title: string; text: string }> {
  let page
  try {
    page = await fetchPublicPage(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch failed"
    const policy = /not allowed|Invalid URL|Only http/.test(message)
    throw new JobTextError(message, policy ? 400 : 502)
  }
  if (page.status < 200 || page.status >= 300) {
    throw new JobTextError(`The page answered ${page.status}`, 502)
  }
  if (page.contentType && !/html|xml|text\/plain/i.test(page.contentType)) {
    throw new JobTextError("That link is not a web page. Paste the posting text instead.", 400)
  }
  const html = page.body
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|footer|header|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? ""
  const text = htmlToText(body).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim()
  return { title: htmlToText(title), text: text.slice(0, 20_000) }
}
