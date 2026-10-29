import { NextResponse } from "next/server"

import { normalizeResume } from "@/lib/resume/defaults"
import { aiReview, aiTailor } from "@/lib/server/ai"
import { aiEnabled } from "@/lib/server/config"

export const runtime = "nodejs"
export const maxDuration = 120

/** POST { action: "review" | "tailor", resume, jobDescription? } */
export async function POST(request: Request) {
  if (!aiEnabled()) return NextResponse.json({ error: "AI is not configured on this server." }, { status: 501 })
  const body = (await request.json().catch(() => ({}))) as {
    action?: string
    resume?: unknown
    jobDescription?: string
  }
  const resume = normalizeResume(body.resume)
  try {
    if (body.action === "review") return NextResponse.json(await aiReview(resume))
    if (body.action === "tailor") {
      if (!body.jobDescription?.trim()) return NextResponse.json({ error: "Paste a job description first." }, { status: 400 })
      return NextResponse.json(await aiTailor(resume, body.jobDescription))
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI failed" }, { status: 502 })
  }
}
