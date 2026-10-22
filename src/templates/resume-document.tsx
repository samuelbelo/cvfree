import "./fonts"
import "./cv.css"

import type { Resume } from "@/lib/resume/schema"

import { makeCtx } from "./blocks"
import { getTemplate } from "./registry"
import { cssVars, PAGE_SIZE } from "./style"

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
      </div>
    </>
  )
}
