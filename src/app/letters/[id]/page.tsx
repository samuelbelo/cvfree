import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LetterEditor } from "@/components/letter/letter-editor"
import { aiEnabled } from "@/lib/server/config"
import { getLetter } from "@/lib/server/letters"
import { getResume } from "@/lib/server/repo"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const letter = await getLetter(id)
  return { title: letter ? `${letter.title} · cvfree` : "Cover letter · cvfree" }
}

export default async function LetterPage({ params }: Props) {
  const { id } = await params
  const letter = await getLetter(id)
  if (!letter) notFound()
  const resume = letter.resumeId ? await getResume(letter.resumeId) : null
  return <LetterEditor initial={letter} resumeTitle={resume?.title ?? null} aiEnabled={aiEnabled()} />
}
