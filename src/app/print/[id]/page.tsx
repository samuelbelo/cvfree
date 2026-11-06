import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { fullName } from "@/lib/resume/format"
import { getResume } from "@/lib/server/repo"
import { ResumeDocument } from "@/templates/resume-document"

export const dynamic = "force-dynamic"

/** The browser's print dialog and Chromium's PDF use this as the document title. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const resume = await getResume(id)
  if (!resume) return {}
  const name = fullName(resume)
  return { title: name ? `${name} – ${resume.title}` : resume.title }
}

/** Bare page with only the resume. The PDF export prints this route. */
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resume = await getResume(id)
  if (!resume) notFound()
  return <ResumeDocument resume={resume} print />
}
