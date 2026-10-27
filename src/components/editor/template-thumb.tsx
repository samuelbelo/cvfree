"use client"

import { memo, useLayoutEffect, useRef, useState } from "react"

import type { Resume } from "@/lib/resume/schema"
import { ResumeDocument } from "@/templates/resume-document"
import { MM_TO_PX, PAGE_SIZE } from "@/templates/style"

/**
 * First page of a resume drawn small. Used by the template picker and the
 * dashboard. It scales to the width of its container.
 */
export const TemplateThumb = memo(function TemplateThumb({ resume }: { resume: Resume }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const page = PAGE_SIZE[resume.settings.page.format]
  const pageW = page.widthMm * MM_TO_PX
  const pageH = page.heightMm * MM_TO_PX

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = width / pageW
  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: `${pageW} / ${pageH}` }} aria-hidden>
      {width > 0 ? (
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left select-none"
          style={{ transform: `scale(${scale})`, width: pageW }}
        >
          <ResumeDocument resume={resume} links={false} />
        </div>
      ) : null}
    </div>
  )
})
