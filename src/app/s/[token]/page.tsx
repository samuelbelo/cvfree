import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Download, FileType2 } from "lucide-react"

import { I18nProvider } from "@/components/app/i18n-provider"
import { Preview } from "@/components/editor/preview"
import { Button } from "@/components/ui/button"
import { fullName } from "@/lib/resume/format"
import type { Locale } from "@/lib/resume/schema"
import { getAppSettings } from "@/lib/server/app-settings"
import { getResumeByShareToken } from "@/lib/server/repo"
import { rich } from "@/lib/ui/rich"
import { translator, type UiLocale } from "@/lib/ui/translate"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ token: string }> }

/**
 * The reader of a public link is not the person who runs this server, so the page
 * follows the language of the resume and not the one picked in Settings.
 */
const readerLocale = (locale: Locale): UiLocale => (locale.startsWith("pt") ? "pt-BR" : "en")

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const resume = await getResumeByShareToken(token)
  const robots = { index: false, follow: false }
  // The tab of a dead link gets the same headline as its page, in the language picked in Settings.
  if (!resume) return { title: translator((await getAppSettings()).uiLocale)("This link is not valid any more"), robots }
  const t = translator(readerLocale(resume.locale))
  return { title: t("{name} – resume", { name: fullName(resume) || resume.title }), robots }
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
  const locale = readerLocale(resume.locale)
  const t = translator(locale)
  return (
    <I18nProvider locale={locale}>
      <div className="flex h-dvh flex-col bg-muted/40">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{name}</div>
            {resume.personal.jobTitle ? <div className="truncate text-xs text-muted-foreground">{resume.personal.jobTitle}</div> : null}
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`/api/s/${token}/export?format=docx`} aria-label={t("Download Word")} />}>
            <FileType2 /> <span className="hidden sm:inline">Word</span>
          </Button>
          <Button size="sm" nativeButton={false} render={<a href={`/api/s/${token}/export?format=pdf`} aria-label={t("Download PDF")} />}>
            <Download /> PDF
          </Button>
        </header>
        <Preview resume={resume} className="flex min-h-0 flex-1" />
        <footer className="shrink-0 border-t bg-background px-4 py-1.5 text-center text-xs text-muted-foreground">
          {rich(t("Made with {cvfree}, the open-source resume builder."), {
            cvfree: (
              <Link href="https://github.com/samuelbelo/cvfree" className="font-medium hover:text-foreground">
                cvfree
              </Link>
            ),
          })}
        </footer>
      </div>
    </I18nProvider>
  )
}
