"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WORDS } from "@/lib/resume/i18n"
import type { Resume } from "@/lib/resume/schema"
import { chromeEdge, ResumeDocument } from "@/templates/resume-document"
import { MM_TO_PX, PAGE_SIZE } from "@/templates/style"

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

function pageLabel(resume: Resume, n: number, total: number) {
  const words = WORDS[resume.locale]
  switch (resume.settings.pageNumbering) {
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

/**
 * Live preview. The real document is rendered at print size and scaled to
 * fit. Dashed lines mark where pages end. The PDF keeps entries whole, so a
 * break can move a few lines compared with the guide.
 */
export function Preview({ resume, className }: { resume: Resume; className?: string }) {
  const [frameRef, frame] = useSize<HTMLDivElement>()
  const [docRef, doc] = useSize<HTMLDivElement>()
  const [zoom, setZoom] = useState(1)

  const page = PAGE_SIZE[resume.settings.page.format]
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
              <div ref={docRef}>
                <ResumeDocument resume={resume} />
              </div>
              {Array.from({ length: pages }, (_, i) => (
                <PageChrome key={i} resume={resume} index={i} total={pages} pageH={pageH} />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* A toolbar of its own, so it never covers the page. */}
      <div className="flex shrink-0 items-center justify-center gap-1 border-t bg-background px-2 py-1.5">
        <Button size="icon" variant="ghost" className="size-7" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">
          <Minus />
        </Button>
        <button type="button" className="min-w-12 text-xs tabular-nums" onClick={() => setZoom(1)} title="Reset zoom">
          {Math.round(zoom * 100)}%
        </button>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">
          <Plus />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {pages} {pages === 1 ? "page" : "pages"}
        </span>
      </div>
    </div>
  )
}

function PageChrome({ resume, index, total, pageH }: { resume: Resume; index: number; total: number; pageH: number }) {
  const s = resume.settings
  const label = pageLabel(resume, index + 1, total)
  const edge = chromeEdge(s.page.marginY)
  const top = index * pageH
  const style = "pointer-events-none absolute right-0 left-0 text-[7.5pt] leading-3 text-[#737980]"
  const pad = { paddingLeft: `${s.page.marginX}mm`, paddingRight: `${s.page.marginX}mm` }
  return (
    <>
      {index > 0 ? (
        <div className="pointer-events-none absolute right-0 left-0 border-t-2 border-dashed border-sky-400/70" style={{ top }}>
          <span className="absolute -top-2.5 right-2 rounded bg-sky-500 px-1.5 text-[9px] font-medium text-white">
            Page {index + 1}
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
