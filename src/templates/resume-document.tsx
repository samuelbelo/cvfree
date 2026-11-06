import "./fonts"
import "./cv.css"

import type { CSSProperties } from "react"

import type { Resume } from "@/lib/resume/schema"

import { makeCtx } from "./blocks"
import { getTemplate } from "./registry"
import { cssVars, MM_TO_PX, PAGE_SIZE } from "./style"

/**
 * Renders one resume with its template. Used by the live preview, the
 * template thumbnails and the print route that the PDF export loads.
 */
export function ResumeDocument({
  resume,
  print = false,
  links = true,
}: {
  resume: Resume
  print?: boolean
  /** Turn off for thumbnails that sit inside a link or a button. */
  links?: boolean
}) {
  const template = getTemplate(resume.settings.template)
  const ctx = makeCtx(resume, template.supportsPhoto, links)
  const Design = template.component
  const page = PAGE_SIZE[resume.settings.page.format]
  return (
    <>
      {print ? (
        <style>{`@page { size: ${page.widthMm}mm ${page.heightMm}mm; margin: 0; } html, body { margin: 0; padding: 0; background: #fff; }`}</style>
      ) : null}
      <div
        className="cv"
        data-template={template.id}
        data-upper={String(resume.settings.uppercaseTitles)}
        data-align={resume.settings.headerAlign}
        lang={resume.locale}
        style={cssVars(resume.settings)}
      >
        <Design ctx={ctx} />
        {print ? <PrintChrome resume={resume} /> : null}
      </div>
    </>
  )
}

/** Distance from the page edge to the header and footer line, in px. Shared with the preview. */
export function chromeEdge(marginY: number) {
  return Math.max(10, (marginY * MM_TO_PX) / 2.4)
}

/**
 * Header and footer text for the PDF. Fixed elements repeat on every printed
 * page, and Chromium draws them with the resume's own font, so any script
 * comes out as typed. Page numbers are stamped afterwards (see pdf.ts).
 */
function PrintChrome({ resume }: { resume: Resume }) {
  const s = resume.settings
  const edge = chromeEdge(s.page.marginY)
  const base: CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    paddingLeft: `${s.page.marginX}mm`,
    paddingRight: `${s.page.marginX}mm`,
    fontSize: "7.5pt",
    lineHeight: "12px",
    color: "#737980",
  }
  return (
    <>
      {s.headerText.trim() ? (
        <div className="cv-print-header" style={{ ...base, top: edge - 4, textAlign: "center" }}>
          {s.headerText}
        </div>
      ) : null}
      {s.footerText.trim() ? (
        <div className="cv-print-footer" style={{ ...base, bottom: edge, textAlign: s.pageNumbering === "none" ? "center" : "left" }}>
          {s.footerText}
        </div>
      ) : null}
    </>
  )
}
