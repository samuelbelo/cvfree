import { NextResponse } from "next/server"

import { fullName } from "@/lib/resume/format"
import { renderDocx } from "@/lib/server/docx"
import { contentDisposition } from "@/lib/server/download"
import { renderPdf } from "@/lib/server/pdf"
import { getResumeByShareToken } from "@/lib/server/repo"

export const runtime = "nodejs"
export const maxDuration = 60

type Ctx = { params: Promise<{ token: string }> }

/** GET /api/s/:token/export?format=pdf|docx. PDF and Word only: no JSON, no raw data. */
export async function GET(request: Request, { params }: Ctx) {
  const { token } = await params
  const resume = await getResumeByShareToken(token)
  if (!resume) return NextResponse.json({ error: "This link is not valid any more." }, { status: 404 })

  const format = new URL(request.url).searchParams.get("format") ?? "pdf"
  const base = fullName(resume) || resume.title
  const headers = (type: string, ext: string) => ({
    "Content-Type": type,
    "Content-Disposition": contentDisposition("attachment", base, ext),
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
  })
  try {
    if (format === "docx") {
      const docx = await renderDocx(resume)
      return new Response(new Uint8Array(docx), {
        headers: headers("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
      })
    }
    const pdf = await renderPdf(resume)
    return new Response(Buffer.from(pdf), { headers: headers("application/pdf", "pdf") })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 })
  }
}
