import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Download, FileType2 } from "lucide-react"

import { Preview } from "@/components/editor/preview"
import { Button } from "@/components/ui/button"
import { fullName } from "@/lib/resume/format"
import { getResumeByShareToken } from "@/lib/server/repo"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const resume = await getResumeByShareToken(token)
  const name = resume ? fullName(resume) || resume.title : "Resume"
  return { title: `${name} – resume`, robots: { index: false, follow: false } }
}

/**
 * Public read-only view of one resume. Anyone with the link sees the page
 * and can download the PDF or the Word file. Revoking the link in the editor
 * turns this page into a 404.
 */
export default async function SharedResumePage({ params }: Props) {
  const { token } = await params
  const resume = await getResumeByShareToken(token)
  if (!resume) notFound()
  const name = fullName(resume) || resume.title
  return (
    <div className="flex h-dvh flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{name}</div>
          {resume.personal.jobTitle ? <div className="truncate text-xs text-muted-foreground">{resume.personal.jobTitle}</div> : null}
        </div>
        <Button variant="outline" size="sm" nativeButton={false} render={<a href={`/api/s/${token}/export?format=docx`} />}>
          <FileType2 /> <span className="hidden sm:inline">Word</span>
        </Button>
        <Button size="sm" nativeButton={false} render={<a href={`/api/s/${token}/export?format=pdf`} />}>
          <Download /> PDF
        </Button>
      </header>
      <Preview resume={resume} className="flex min-h-0 flex-1" />
      <footer className="shrink-0 border-t bg-background px-4 py-1.5 text-center text-xs text-muted-foreground">
        Made with{" "}
        <Link href="https://github.com/samuelbelo/cvfree" className="font-medium hover:text-foreground">
          cvfree
        </Link>
        , the open-source resume builder.
      </footer>
    </div>
  )
}
