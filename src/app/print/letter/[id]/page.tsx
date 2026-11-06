import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getLetter } from "@/lib/server/letters"
import { LetterDocument } from "@/templates/letter-document"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const letter = await getLetter(id)
  if (!letter) return {}
  return { title: `${letter.sender.name || "Cover letter"} – ${letter.recipient.company || letter.title}` }
}

/** Bare page with only the letter. The PDF export prints this route. */
export default async function PrintLetterPage({ params }: Props) {
  const { id } = await params
  const letter = await getLetter(id)
  if (!letter) notFound()
  return <LetterDocument letter={letter} print />
}
