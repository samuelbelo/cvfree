import { NextResponse } from "next/server"

import { BackupError, createBackup, restoreBackup } from "@/lib/server/backup"
import { contentDisposition } from "@/lib/server/download"
import { readUpload } from "@/lib/server/upload"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
  const upload = await readUpload(request)
  if (upload.error) return upload.error

  try {
    return NextResponse.json(await restoreBackup(upload.body))
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: 400 })
    throw error
  }
}
