import "./fonts"
import "./cv.css"

import { letterClosing, letterDate, letterGreeting } from "@/lib/letter/format"
import type { Letter } from "@/lib/letter/schema"
import { WORDS } from "@/lib/resume/i18n"
import { sanitizeHtml } from "@/lib/resume/sanitize"

import { cssVars, PAGE_SIZE } from "./style"

/**
 * One letter layout for every resume style: the colour, fonts, sizes and
 * margins come from the same settings, so a letter made from a resume matches
 * it. Used by the editor preview and by the print route behind the PDF.
 */
export function LetterDocument({ letter, print = false }: { letter: Letter; print?: boolean }) {
  const s = letter.sender
  const r = letter.recipient
  const w = WORDS[letter.locale]
  const page = PAGE_SIZE[letter.settings.page.format]
  const contact = [s.email, s.phone, s.location, s.website].filter((v) => v.trim())
  const toLines = [r.company, r.name, r.address].map((v) => v.trim()).filter(Boolean)
  return (
    <>
      {print ? (
        <style>{`@page { size: ${page.widthMm}mm ${page.heightMm}mm; margin: 0; } html, body { margin: 0; padding: 0; background: #fff; }`}</style>
      ) : null}
      <div className="cv cv-letter" data-align={letter.settings.headerAlign} lang={letter.locale} style={cssVars(letter.settings)}>
        <header className="cv-letter-head">
          <div className="cv-letter-name">{s.name || "Your Name"}</div>
          {s.jobTitle ? <div className="cv-letter-title">{s.jobTitle}</div> : null}
          {contact.length ? (
            <div className="cv-letter-contact">
              {contact.map((c, i) => (
                <span key={i}>
                  {i > 0 ? <span className="cv-letter-sep">·</span> : null}
                  {c}
                </span>
              ))}
            </div>
          ) : null}
        </header>
        <div className="cv-letter-meta">
          <div className="cv-letter-to">
            {toLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <div className="cv-letter-date">{letterDate(letter)}</div>
        </div>
        {r.position.trim() ? (
          <div className="cv-letter-re">
            <strong>{w.regarding}</strong> {r.position.trim()}
          </div>
        ) : null}
        <p className="cv-letter-greeting">{letterGreeting(letter)}</p>
        {letter.body.trim() ? (
          <div className="cv-rich cv-letter-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(letter.body) }} />
        ) : (
          <div className="cv-letter-body cv-letter-empty">
            <p>Three or four short paragraphs: why this role, what you bring, one result you are proud of, and how to reach you.</p>
          </div>
        )}
        <div className="cv-letter-closing">
          <div>{letterClosing(letter)}</div>
          <div className="cv-letter-signature">{s.name}</div>
        </div>
      </div>
    </>
  )
}
