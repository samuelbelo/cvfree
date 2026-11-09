import { createBackup } from "@/lib/server/backup"
import { contentDisposition } from "@/lib/server/download"

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
