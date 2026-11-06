import { NextResponse } from "next/server"

import { normalizeLetter } from "@/lib/letter/defaults"
import { deleteLetter, getLetter, saveLetter } from "@/lib/server/letters"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const letter = await getLetter(id)
  if (!letter) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(letter)
}

/** Full replace, with the same two-tab conflict check as resumes. */
export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params
  const existing = await getLetter(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  const { baseUpdatedAt, ...letter } = body as { baseUpdatedAt?: unknown }
  if (typeof baseUpdatedAt === "string" && baseUpdatedAt !== existing.updatedAt) {
    return NextResponse.json({ error: "This letter was changed in another tab or window.", updatedAt: existing.updatedAt }, { status: 409 })
  }
  const saved = await saveLetter(normalizeLetter({ ...letter, id, createdAt: existing.createdAt }))
  return NextResponse.json({ updatedAt: saved.updatedAt })
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const existing = await getLetter(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = (await request.json().catch(() => ({}))) as { title?: string }
  if (typeof body.title === "string") existing.title = body.title.slice(0, 120) || existing.title
  const saved = await saveLetter(existing)
  return NextResponse.json({ updatedAt: saved.updatedAt, title: saved.title })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const ok = await deleteLetter(id)
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}
