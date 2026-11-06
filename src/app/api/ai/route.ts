import { NextResponse } from "next/server"

import { normalizeLetter } from "@/lib/letter/defaults"
import { normalizeResume } from "@/lib/resume/defaults"
import { aiLetter, aiReview, aiTailor } from "@/lib/server/ai"
import { aiEnabled } from "@/lib/server/config"

export const runtime = "nodejs"
export const maxDuration = 120

/** POST { action: "review" | "tailor" | "letter", resume?, letter?, jobDescription? } */
export async function POST(request: Request) {
  if (!aiEnabled()) return NextResponse.json({ error: "AI is not configured on this server." }, { status: 501 })
  const body = (await request.json().catch(() => ({}))) as {
    action?: string
    resume?: unknown
    letter?: unknown
    jobDescription?: string
  }
  try {
    if (body.action === "letter") {
      if (!body.jobDescription?.trim()) return NextResponse.json({ error: "Paste the job posting first." }, { status: 400 })
      const letter = normalizeLetter(body.letter)
      const resume = body.resume ? normalizeResume(body.resume) : null
      return NextResponse.json(await aiLetter(letter, resume, body.jobDescription))
    }
    const resume = normalizeResume(body.resume)
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
