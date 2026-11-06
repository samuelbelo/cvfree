import { NextResponse } from "next/server"

import { letterToText } from "@/lib/letter/format"
import { renderLetterDocx } from "@/lib/server/docx"
import { contentDisposition } from "@/lib/server/download"
import { getLetter } from "@/lib/server/letters"
import { renderLetterPdf } from "@/lib/server/pdf"

export const runtime = "nodejs"
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/letters/:id/export?format=pdf|docx|txt|json */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params
  const letter = await getLetter(id)
  if (!letter) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const search = new URL(request.url).searchParams
  const format = search.get("format") ?? "pdf"
  const disposition = search.get("inline") === "1" ? "inline" : "attachment"
  const base = [letter.sender.name, letter.recipient.company ? `cover letter ${letter.recipient.company}` : "cover letter"].filter(Boolean).join(" ")
  const headers = (type: string, ext: string) => ({
    "Content-Type": type,
    "Content-Disposition": contentDisposition(disposition, base, ext),
    "Cache-Control": "no-store",
  })

  try {
    switch (format) {
      case "pdf":
        return new Response(Buffer.from(await renderLetterPdf(letter)), { headers: headers("application/pdf", "pdf") })
      case "docx":
        return new Response(new Uint8Array(await renderLetterDocx(letter)), {
          headers: headers("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
        })
      case "txt":
        return new Response(letterToText(letter), { headers: headers("text/plain; charset=utf-8", "txt") })
      case "json":
        return new Response(JSON.stringify({ cvfree: 1, letter }, null, 2), { headers: headers("application/json", "cvfree.json") })
      default:
        return NextResponse.json({ error: `Unknown format ${format}` }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 })
  }
}
