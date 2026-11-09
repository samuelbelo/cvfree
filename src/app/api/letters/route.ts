import { NextResponse } from "next/server"

import { emptyLetter } from "@/lib/letter/defaults"
import { LOCALES, type Locale } from "@/lib/resume/schema"
import { getAppSettings } from "@/lib/server/app-settings"
import { translator } from "@/lib/ui/translate"
import { listLetters, saveLetter } from "@/lib/server/letters"
import { getResume } from "@/lib/server/repo"
import { toLetterSummary } from "@/lib/letter/defaults"

export async function GET() {
  return NextResponse.json(await listLetters())
}

/** Create a cover letter. Body: { resumeId?, title?, locale? } */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { resumeId?: string; title?: string; locale?: string }
  const resume = body.resumeId ? await getResume(body.resumeId) : null
  if (body.resumeId && !resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 })
  const prefs = await getAppSettings()
  const locale: Locale = LOCALES.includes(body.locale as Locale) ? (body.locale as Locale) : (resume?.locale ?? prefs.defaultLocale)
  const letter = emptyLetter({ resume, locale, title: body.title?.slice(0, 120) || translator(prefs.uiLocale)("Untitled cover letter") })
  if (!resume) letter.settings = { ...letter.settings, color: prefs.defaultColor }
  const saved = await saveLetter(letter)
  return NextResponse.json(toLetterSummary(saved), { status: 201 })
}
