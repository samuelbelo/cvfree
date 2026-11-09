import { NextResponse } from "next/server"

import { emptyResume, newId, normalizeResume } from "@/lib/resume/defaults"
import { fromLinkedin, LINKEDIN_FILES } from "@/lib/resume/linkedin"
import { getAppSettings } from "@/lib/server/app-settings"
import { saveResume, toSummary } from "@/lib/server/repo"
import { readUpload } from "@/lib/server/upload"
import { unzip, type ZipEntry } from "@/lib/server/zip"
import { getTemplate } from "@/templates/registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const WANTED = new Set<string>(LINKEDIN_FILES)
const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1).toLowerCase()
const depth = (path: string) => path.split("/").length

const refuse = (error: string) => NextResponse.json({ error }, { status: 400 })

/**
 * POST /api/import/linkedin creates a resume from a LinkedIn data archive, the
 * zip from "Get a copy of your data", sent as the raw body.
 */
export async function POST(request: Request) {
  const upload = await readUpload(request)
  if (upload.error) return upload.error

  let entries: ZipEntry[]
  let isBackup = false
  try {
    entries = unzip(upload.body, {
      maxEntries: 50_000,
      maxEntryBytes: 10 * 1024 * 1024,
      maxTotalBytes: 50 * 1024 * 1024,
      filter: (name) => {
        if (/(?:^|\/)resumes\/[^/]+\.json$/.test(name)) isBackup = true
        return WANTED.has(fileName(name))
      },
    })
  } catch (error) {
    return refuse(error instanceof Error ? error.message : "This zip could not be read")
  }
  if (isBackup) return refuse("This is a cvfree backup. Restore it in Settings, under Backup.")

  // The files sit at the top of the archive. A copy deeper down only counts when the top has none.
  const files = new Map<string, string>()
  for (const entry of [...entries].sort((a, b) => depth(a.name) - depth(b.name))) {
    const name = fileName(entry.name)
    if (!files.has(name)) files.set(name, entry.data.toString("utf8"))
  }

  const prefs = await getAppSettings()
  const template = getTemplate(prefs.defaultTemplate)
  const settings = { ...template.defaults, template: template.id, color: prefs.defaultColor }
  const imported = fromLinkedin(files, emptyResume({ locale: prefs.defaultLocale, settings }))
  if (!imported) {
    return refuse(
      "No LinkedIn profile was found in this zip. It should hold Profile.csv and Positions.csv. When LinkedIn sends the archive in parts, use the complete one."
    )
  }

  const now = new Date().toISOString()
  const resume = normalizeResume({ ...imported, id: newId(), createdAt: now, updatedAt: now, shareToken: null })
  const saved = await saveResume(resume)
  return NextResponse.json(toSummary(saved), { status: 201 })
}
