import { NextResponse } from "next/server"

import { emptyResume, newId, normalizeResume, sampleResume } from "@/lib/resume/defaults"
import { fromJsonResume, isJsonResume } from "@/lib/resume/json-resume"
import { LOCALES, type Locale } from "@/lib/resume/schema"
import { getAppSettings } from "@/lib/server/app-settings"
import { getTemplate } from "@/templates/registry"
import { listResumes, saveResume, toSummary } from "@/lib/server/repo"

export async function GET() {
  return NextResponse.json(await listResumes())
}

/**
 * Create a resume.
 * Body: { mode: "blank" | "sample" | "import", title?, locale?, data? }
 * An import takes a cvfree backup or a JSON Resume file (jsonresume.org).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    mode?: string
    title?: string
    locale?: string
    data?: unknown
  }
  const prefs = await getAppSettings()
  const locale: Locale = LOCALES.includes(body.locale as Locale) ? (body.locale as Locale) : prefs.defaultLocale
  const template = getTemplate(prefs.defaultTemplate)
  const settings = { ...template.defaults, template: template.id, color: prefs.defaultColor }

  let resume
  if (body.mode === "import") {
    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json({ error: "Missing resume data" }, { status: 400 })
    }
    const raw = body.data as Record<string, unknown>
    const foreign = isJsonResume(raw)
    if (!foreign && !Array.isArray(raw.sections) && !(raw.personal && typeof raw.personal === "object")) {
      return NextResponse.json({ error: "Not a cvfree backup or a JSON Resume file" }, { status: 400 })
    }
    const now = new Date().toISOString()
    // A backup never brings its public link along. The import starts private.
    const data = foreign ? fromJsonResume(raw, emptyResume({ locale, settings })) : raw
    resume = normalizeResume({ ...data, id: newId(), createdAt: now, updatedAt: now, shareToken: null })
  } else if (body.mode === "sample") {
    resume = sampleResume({ locale, settings })
  } else {
    resume = emptyResume({ locale, settings })
  }
  if (body.title) resume.title = body.title.slice(0, 120)

  const saved = await saveResume(resume)
  return NextResponse.json(toSummary(saved), { status: 201 })
}
