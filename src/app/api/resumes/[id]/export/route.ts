import { NextResponse } from "next/server"

import { fullName } from "@/lib/resume/format"
import { toJsonResume } from "@/lib/resume/json-resume"
import { resumeToText } from "@/lib/resume/text-export"
import { renderDocx } from "@/lib/server/docx"
import { contentDisposition } from "@/lib/server/download"
import { renderPdf } from "@/lib/server/pdf"
import { getResume } from "@/lib/server/repo"
import { inEveryLanguage } from "@/lib/ui/translate"

export const runtime = "nodejs"
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/resumes/:id/export?format=pdf|docx|txt|json|jsonresume */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params
  const resume = await getResume(id)
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const search = new URL(request.url).searchParams
  const format = search.get("format") ?? "pdf"
  const disposition = search.get("inline") === "1" ? "inline" : "attachment"
  const base = fullName(resume) ? `${fullName(resume)} ${inEveryLanguage("Untitled resume").includes(resume.title) ? "" : resume.title}` : resume.title
  const headers = (type: string, ext: string) => ({
    "Content-Type": type,
    "Content-Disposition": contentDisposition(disposition, base, ext),
    "Cache-Control": "no-store",
  })

  try {
    switch (format) {
      case "pdf": {
        const pdf = await renderPdf(resume)
        return new Response(Buffer.from(pdf), { headers: headers("application/pdf", "pdf") })
      }
      case "docx": {
        const docx = await renderDocx(resume)
        return new Response(new Uint8Array(docx), {
          headers: headers("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
        })
      }
      case "txt":
        return new Response(resumeToText(resume), { headers: headers("text/plain; charset=utf-8", "txt") })
      case "json":
        return new Response(JSON.stringify({ cvfree: 1, resume }, null, 2), {
          headers: headers("application/json", "cvfree.json"),
        })
      case "jsonresume":
        return new Response(JSON.stringify(toJsonResume(resume), null, 2), {
          headers: headers("application/json", "resume.json"),
        })
      default:
        return NextResponse.json({ error: `Unknown format ${format}` }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
