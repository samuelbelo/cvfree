import { NextResponse } from "next/server"

import { JobTextError, readJobPosting } from "@/lib/server/job-text"

export const runtime = "nodejs"

/** Fetch a job posting URL and return its readable text for the Tailor tab. */
export async function POST(request: Request) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string }
  try {
    return NextResponse.json(await readJobPosting(url ?? ""))
  } catch (error) {
    if (error instanceof JobTextError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fetch failed" }, { status: 502 })
  }
}
