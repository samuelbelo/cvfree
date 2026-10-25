import { NextResponse } from "next/server"

import { emptyResume, newId, normalizeResume, sampleResume } from "@/lib/resume/defaults"
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
    const now = new Date().toISOString()
    resume = normalizeResume({ ...(body.data as object), id: newId(), createdAt: now, updatedAt: now })
  } else if (body.mode === "sample") {
    resume = sampleResume({ locale, settings })
  } else {
    resume = emptyResume({ locale, settings })
  }
  if (body.title) resume.title = body.title.slice(0, 120)

  const saved = await saveResume(resume)
  return NextResponse.json(toSummary(saved), { status: 201 })
}
