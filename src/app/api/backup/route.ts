import { NextResponse } from "next/server"

import { BackupError, createBackup, restoreBackup } from "@/lib/server/backup"
import { contentDisposition } from "@/lib/server/download"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Keep in step with proxyClientMaxBodySize in next.config.ts. */
const MAX_UPLOAD = 100 * 1024 * 1024

/** GET /api/backup downloads every resume, cover letter and the settings as one zip. */
export async function GET() {
  const backup = await createBackup()
  const day = backup.createdAt.toISOString().slice(0, 10)
  return new Response(new Uint8Array(backup.zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition("attachment", `cvfree-backup-${day}`, "zip"),
      "Cache-Control": "no-store",
    },
  })
}

/** POST /api/backup merges a backup zip, sent as the raw body, into this instance. */
export async function POST(request: Request) {
  const tooLarge = () => NextResponse.json({ error: "This file is larger than the 100 MB a backup can be" }, { status: 413 })
  const declared = Number(request.headers.get("content-length") ?? "")
  if (declared > MAX_UPLOAD) return tooLarge()

  const body = Buffer.from(await request.arrayBuffer())
  if (body.length > MAX_UPLOAD) return tooLarge()
  // A body past the proxy limit arrives cut off with no error, so a short read is checked here.
  if (declared > 0 && body.length !== declared) {
    return NextResponse.json({ error: "The upload was cut short. Try again." }, { status: 400 })
  }

  try {
    return NextResponse.json(await restoreBackup(body))
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: 400 })
    throw error
  }
}
