import { NextResponse } from "next/server"

import { getResume, listSnapshots, restoreSnapshot } from "@/lib/server/repo"

type Ctx = { params: Promise<{ id: string }> }

/** GET: the saved versions of a resume, newest first. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  if (!(await getResume(id))) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(await listSnapshots(id))
}

/** POST { at }: make that version the current one. The version it replaces is kept too. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { at?: string }
  if (!body.at) return NextResponse.json({ error: "Missing version" }, { status: 400 })
  const restored = await restoreSnapshot(id, body.at)
  if (!restored) return NextResponse.json({ error: "That version no longer exists" }, { status: 404 })
  return NextResponse.json(restored)
}
