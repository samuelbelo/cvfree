import { NextResponse } from "next/server"

import { normalizeResume } from "@/lib/resume/defaults"
import { deleteResume, getResume, saveResume } from "@/lib/server/repo"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const resume = await getResume(id)
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(resume)
}

/** Full replace. The editor autosaves the whole document. */
export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params
  const existing = await getResume(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  // The editor sends the updatedAt it last saw. A different value on disk means
  // another tab or window saved in between, so this write would erase its work.
  const { baseUpdatedAt, ...resume } = body as { baseUpdatedAt?: unknown }
  if (typeof baseUpdatedAt === "string" && baseUpdatedAt !== existing.updatedAt) {
    return NextResponse.json(
      { error: "This resume was changed in another tab or window.", updatedAt: existing.updatedAt },
      { status: 409 }
    )
  }
  const saved = await saveResume(
    normalizeResume({ ...resume, id, createdAt: existing.createdAt })
  )
  return NextResponse.json({ updatedAt: saved.updatedAt })
}

/** Partial update for small dashboard actions such as renaming. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const existing = await getResume(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = (await request.json().catch(() => ({}))) as { title?: string }
  if (typeof body.title === "string") existing.title = body.title.slice(0, 120) || existing.title
  const saved = await saveResume(existing)
  return NextResponse.json({ updatedAt: saved.updatedAt, title: saved.title })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const ok = await deleteResume(id)
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}
