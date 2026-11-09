"use client"

import { useState } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { Loader2, Minimize2 } from "lucide-react"
import { toast } from "sonner"

import { useT } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"
import { describeFit, loosestFit, tighten } from "@/lib/resume/fit"
import type { Resume, ResumeSettings } from "@/lib/resume/schema"
import { useEditor } from "@/store/editor-store"
import { ResumeDocument } from "@/templates/resume-document"
import { MM_TO_PX, PAGE_SIZE } from "@/templates/style"

/**
 * Lays the resume out off screen with other settings and reports its height.
 * The fonts are the ones already on the page, so the numbers match the preview.
 */
function makeRuler(resume: Resume) {
  const host = document.createElement("div")
  host.style.cssText = "position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none"
  host.setAttribute("aria-hidden", "true")
  document.body.appendChild(host)
  const root = createRoot(host)
  return {
    height(settings: ResumeSettings) {
      flushSync(() => root.render(<ResumeDocument resume={{ ...resume, settings }} links={false} />))
      return host.querySelector(".cv")?.getBoundingClientRect().height ?? 0
    },
    done() {
      root.unmount()
      host.remove()
    },
  }
}

function apply(settings: ResumeSettings) {
  // lastPush: 0 keeps this out of the previous undo step, so one Undo brings the old layout back.
  useEditor.setState({ lastPush: 0 })
  useEditor.getState().update((d) => void (d.settings = settings))
  useEditor.setState({ lastPush: 0 })
}

/** Shown in the preview bar while the resume runs past one page. */
export function FitPageButton({ resume }: { resume: Resume }) {
  const t = useT()
  const [busy, setBusy] = useState(false)

  const fit = () => {
    setBusy(true)
    // Let the spinner paint before the measurements block the thread for a moment.
    requestAnimationFrame(() =>
      setTimeout(() => {
        const before = resume.settings
        const pageH = PAGE_SIZE[before.page.format].heightMm * MM_TO_PX
        const ruler = makeRuler(resume)
        try {
          // The page is at least one sheet tall, so a resume that fits measures exactly one sheet.
          // Anything taller has spilled over, even by a pixel of bottom margin.
          const fitted = loosestFit(before, (candidate) => ruler.height(candidate) <= pageH + 0.5)
          if (fitted) {
            apply(fitted)
            toast.success(t("Fits on one page"), {
              description: describeFit(before, fitted, t) || undefined,
              // Long enough to read what changed and still reach Undo.
              duration: 8000,
              action: { label: t("Undo"), onClick: () => useEditor.getState().undo() },
            })
            return
          }
          const tightest = tighten(before, 1)
          const pages = Math.max(2, Math.ceil((Math.round(ruler.height(tightest)) - 2) / pageH))
          toast.warning(t("Too much content for one page. The tightest readable layout still takes {pages} pages.", { pages }), {
            description: t("Hide a section or shorten the longest entries, then try again."),
            duration: 10000,
            action: { label: t("Tighten anyway"), onClick: () => apply(tightest) },
          })
        } finally {
          ruler.done()
          setBusy(false)
        }
      }, 0)
    )
  }

  return (
    <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-xs" onClick={fit} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Minimize2 />} {t("Fit to one page")}
    </Button>
  )
}
