import { NextResponse } from "next/server"

import { newId } from "@/lib/resume/defaults"
import { getPreset } from "@/lib/resume/presets"
import type { Section } from "@/lib/resume/schema"
import { getResume, saveResume, toSummary } from "@/lib/server/repo"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST { sourceId, title? }: a new resume made of this one plus the sections
 * of another. Sections that can only exist once (summary, skills, languages)
 * are merged into the matching one. Both originals stay untouched.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { sourceId?: string; title?: string }
  const [target, source] = await Promise.all([getResume(id), body.sourceId ? getResume(body.sourceId) : null])
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!source) return NextResponse.json({ error: "Pick a resume to combine with" }, { status: 400 })

  const sections: Section[] = structuredClone(target.sections)
  for (const incoming of structuredClone(source.sections)) {
    // Same type and, for sections that can repeat (several skill lists), the same title: merge. Otherwise append.
    const preset = getPreset(incoming.type)
    const existing = sections.find(
      (s) => s.type === incoming.type && s.kind === incoming.kind && (preset.single || s.title.trim() === incoming.title.trim())
    )
    if (!existing) {
      sections.push(withNewIds(incoming))
      continue
    }
    if (existing.kind === "text" && incoming.kind === "text") {
      existing.html = existing.html && incoming.html ? `${existing.html}${incoming.html}` : existing.html || incoming.html
    } else if (existing.kind === "timeline" && incoming.kind === "timeline") {
      existing.items.push(...incoming.items.map((i) => ({ ...i, id: newId() })))
    } else if (existing.kind === "skills" && incoming.kind === "skills") {
      const names = new Set(existing.items.map((i) => i.name.trim().toLowerCase()))
      existing.items.push(...incoming.items.filter((i) => !names.has(i.name.trim().toLowerCase())).map((i) => ({ ...i, id: newId() })))
    } else if (existing.kind === "links" && incoming.kind === "links") {
      const urls = new Set(existing.items.map((i) => i.url.trim().toLowerCase()))
      existing.items.push(...incoming.items.filter((i) => !urls.has(i.url.trim().toLowerCase())).map((i) => ({ ...i, id: newId() })))
    } else if (existing.kind === "references" && incoming.kind === "references") {
      existing.items.push(...incoming.items.map((i) => ({ ...i, id: newId() })))
    }
  }

  const now = new Date().toISOString()
  const combined = await saveResume({
    ...structuredClone(target),
    id: newId(),
    title: body.title?.slice(0, 120) || `${target.title} + ${source.title}`,
    sections,
    createdAt: now,
    updatedAt: now,
    shareToken: null,
  })
  return NextResponse.json(toSummary(combined), { status: 201 })
}

function withNewIds(section: Section): Section {
  const copy = { ...section, id: newId() }
  if ("items" in copy) copy.items = copy.items.map((i: { id: string }) => ({ ...i, id: newId() })) as typeof copy.items
  return copy
}
