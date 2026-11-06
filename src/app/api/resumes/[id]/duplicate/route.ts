import { NextResponse } from "next/server"

import { newId } from "@/lib/resume/defaults"
import { getResume, saveResume, toSummary } from "@/lib/server/repo"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const source = await getResume(id)
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = (await request.json().catch(() => ({}))) as { title?: string }
  const now = new Date().toISOString()
  const copy = await saveResume({
    ...structuredClone(source),
    id: newId(),
    title: body.title?.slice(0, 120) || `${source.title} (copy)`,
    createdAt: now,
    updatedAt: now,
    shareToken: null,
  })
  return NextResponse.json(toSummary(copy), { status: 201 })
}
