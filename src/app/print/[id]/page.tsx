import { notFound } from "next/navigation"

import { getResume } from "@/lib/server/repo"
import { ResumeDocument } from "@/templates/resume-document"

export const dynamic = "force-dynamic"

/** Bare page with only the resume. The PDF export prints this route. */
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resume = await getResume(id)
  if (!resume) notFound()
  return <ResumeDocument resume={resume} print />
}
