import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EditorShell } from "@/components/editor/editor-shell"
import { aiEnabled } from "@/lib/server/config"
import { getResume } from "@/lib/server/repo"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const resume = await getResume(id)
  return { title: resume ? `${resume.title} · cvfree` : "Resume · cvfree" }
}

export default async function ResumePage({ params }: Props) {
  const { id } = await params
  const resume = await getResume(id)
  if (!resume) notFound()
  return <EditorShell initial={resume} aiEnabled={aiEnabled()} />
}
