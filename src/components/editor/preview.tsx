"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Minus, Plus } from "lucide-react"

import { useT } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WORDS } from "@/lib/resume/i18n"
import type { Locale, Resume, ResumeSettings } from "@/lib/resume/schema"
import { chromeEdge, ResumeDocument } from "@/templates/resume-document"
import { MM_TO_PX, PAGE_SIZE } from "@/templates/style"

import { FitPageButton } from "./fit-page"

/** Track an element's size. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      // Skip sub-pixel changes so a rounding wobble cannot start a resize loop.
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

function pageLabel(settings: ResumeSettings, locale: Locale, n: number, total: number) {
  const words = WORDS[locale]
  switch (settings.pageNumbering) {
    case "numbers":
      return `${n}`
    case "fraction":
      return `${n}/${total}`
    case "page":
      return `${words.page} ${n} ${words.of} ${total}`
    default:
      return ""
  }
}

/** Live preview of a resume. */
export function Preview({ resume, className }: { resume: Resume; className?: string }) {
  return (
    <PagePreview
      settings={resume.settings}
      locale={resume.locale}
      className={className}
      extra={(pages) => (pages > 1 ? <FitPageButton resume={resume} /> : null)}
    >
      <ResumeDocument resume={resume} />
    </PagePreview>
  )
}

/**
 * Any document rendered at print size and scaled to fit, with page break
 * guides and a zoom bar. Dashed lines mark where pages end. The PDF keeps
 * entries whole, so a break can move a few lines compared with the guide.
 */
export function PagePreview({
  settings,
  locale,
  className,
  extra,
  children,
}: {
  settings: ResumeSettings
  locale: Locale
  className?: string
  /** Extra controls for the bar under the page, given the current page count. */
  extra?: (pages: number) => ReactNode
  children: ReactNode
}) {
  const t = useT()
  const [frameRef, frame] = useSize<HTMLDivElement>()
  const [docRef, doc] = useSize<HTMLDivElement>()
  const [zoom, setZoom] = useState(1)

  const page = PAGE_SIZE[settings.page.format]
  const pageW = page.widthMm * MM_TO_PX
  const pageH = page.heightMm * MM_TO_PX
  const fit = frame.width ? Math.min(1.25, (frame.width - 48) / pageW) : 0.6
  const scale = Math.max(0.2, fit * zoom)
  const pages = Math.max(1, Math.ceil((doc.height - 2) / pageH))

  return (
    <div className={cn("flex-col", className)}>
      {/* The scrollbar gutter is always reserved. Otherwise the scrollbar showing up
          narrows the frame, the page shrinks, the scrollbar goes away, and it loops. */}
      <div ref={frameRef} className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
        <div className="mx-auto py-6" style={{ width: pageW * scale }}>
          <div className="relative" style={{ height: Math.max(doc.height, pageH) * scale }}>
            <div
              className="absolute top-0 left-0 origin-top-left overflow-hidden rounded-sm bg-white shadow-[0_2px_24px_rgba(0,0,0,0.12)]"
              style={{ transform: `scale(${scale})`, width: pageW }}
            >
              <div ref={docRef}>{children}</div>
              {Array.from({ length: pages }, (_, i) => (
                <PageChrome key={i} settings={settings} locale={locale} index={i} total={pages} pageH={pageH} />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* A toolbar of its own, so it never covers the page. */}
      <div className="flex shrink-0 items-center justify-center gap-1 border-t bg-background px-2 py-1.5">
        <Button size="icon" variant="ghost" className="size-7" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} aria-label={t("Zoom out")}>
          <Minus />
        </Button>
        <button type="button" className="min-w-12 text-xs tabular-nums" onClick={() => setZoom(1)} title={t("Reset zoom")}>
          {Math.round(zoom * 100)}%
        </button>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} aria-label={t("Zoom in")}>
          <Plus />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {t(pages === 1 ? "1 page" : "{n} pages", { n: pages })}
        </span>
        {extra?.(pages)}
      </div>
    </div>
  )
}

function PageChrome({ settings: s, locale, index, total, pageH }: { settings: ResumeSettings; locale: Locale; index: number; total: number; pageH: number }) {
  const t = useT()
  const label = pageLabel(s, locale, index + 1, total)
  const edge = chromeEdge(s.page.marginY)
  const top = index * pageH
  const style = "pointer-events-none absolute right-0 left-0 text-[7.5pt] leading-3 text-[#737980]"
  const pad = { paddingLeft: `${s.page.marginX}mm`, paddingRight: `${s.page.marginX}mm` }
  return (
    <>
      {index > 0 ? (
        <div className="pointer-events-none absolute right-0 left-0 border-t-2 border-dashed border-sky-400/70" style={{ top }}>
          <span className="absolute -top-2.5 right-2 rounded bg-sky-500 px-1.5 text-[9px] font-medium text-white">
            {t("Page {n}", { n: index + 1 })}
          </span>
        </div>
      ) : null}
      {s.headerText.trim() ? (
        <div className={`${style} text-center`} style={{ top: top + edge - 4, ...pad }}>
          {s.headerText}
        </div>
      ) : null}
      {s.footerText.trim() || label ? (
        <div
          className={`${style} flex`}
          style={{ top: top + pageH - edge - 12, ...pad, justifyContent: s.footerText.trim() && label ? "space-between" : "center" }}
        >
          {s.footerText.trim() ? <span>{s.footerText}</span> : null}
          {label ? <span>{label}</span> : null}
        </div>
      ) : null}
    </>
  )
}
