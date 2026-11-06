import type { ReactNode } from "react"
import { Globe, Link2, Mail, MapPin, Phone } from "lucide-react"

import { formatDate, formatRange, fullName, hrefFor, isEmail, isHtmlEmpty, isPhone, isUrl, prettyUrl, sectionTitle } from "@/lib/resume/format"
import { sanitizeHtml } from "@/lib/resume/sanitize"
import { WORDS } from "@/lib/resume/i18n"
import { getPreset } from "@/lib/resume/presets"
import type { Resume, Section, SectionOf, TimelineItem } from "@/lib/resume/schema"

/*
 * Building blocks shared by every template. A template decides the page
 * structure and the CSS, these pieces render the content the same way
 * everywhere, so a fix here lands in all templates at once.
 */

export type Ctx = {
  resume: Resume
  s: Resume["settings"]
  w: (typeof WORDS)["en"]
  name: string
  hasPhoto: boolean
  /** False for thumbnails, which sit inside links and buttons and must not nest anchors. */
  links: boolean
}

export function makeCtx(resume: Resume, supportsPhoto: boolean, links = true): Ctx {
  return {
    links,
    resume,
    s: resume.settings,
    w: WORDS[resume.locale],
    name: fullName(resume) || "Your Name",
    hasPhoto: supportsPhoto && resume.settings.photo.show && Boolean(resume.personal.photo),
  }
}

/* ------------------------------------------------------------------ */
/* Section filtering                                                   */
/* ------------------------------------------------------------------ */

export function hasContent(section: Section): boolean {
  if (section.hidden) return false
  switch (section.kind) {
    case "text":
      return !isHtmlEmpty(section.html)
    case "references":
      return section.onRequest || section.items.some((i) => i.name.trim())
    case "timeline":
      return section.items.some((i) => i.title.trim() || i.subtitle.trim() || !isHtmlEmpty(i.description))
    case "skills":
      return section.items.some((i) => i.name.trim())
    case "links":
      return section.items.some((i) => i.url.trim())
  }
}

export function visibleSections(ctx: Ctx): Section[] {
  return ctx.resume.sections.filter(hasContent)
}

export function columnOf(section: Section): "main" | "side" {
  return section.column === "auto" ? getPreset(section.type).column : section.column
}

export function splitColumns(ctx: Ctx) {
  const all = visibleSections(ctx)
  return {
    main: all.filter((s) => columnOf(s) === "main"),
    side: all.filter((s) => columnOf(s) === "side"),
  }
}

/* ------------------------------------------------------------------ */
/* Header pieces                                                       */
/* ------------------------------------------------------------------ */

export function Photo({ ctx, className = "" }: { ctx: Ctx; className?: string }) {
  if (!ctx.hasPhoto) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`cv-photo ${className}`} src={ctx.resume.personal.photo!} alt="" />
}

type ContactItem = { key: string; icon: ReactNode; text: string; href?: string }

export function contactItems(ctx: Ctx): ContactItem[] {
  const p = ctx.resume.personal
  const items: ContactItem[] = []
  const place = [p.city, p.country].filter(Boolean).join(", ")
  if (place) items.push({ key: "place", icon: <MapPin />, text: place })
  // Values that do not look like an address are shown as text, never as a broken link.
  if (p.email) items.push({ key: "email", icon: <Mail />, text: p.email, href: isEmail(p.email) ? `mailto:${p.email}` : undefined })
  if (p.phone) items.push({ key: "phone", icon: <Phone />, text: p.phone, href: isPhone(p.phone) ? `tel:${p.phone.replace(/[\s().-]/g, "")}` : undefined })
  if (p.website) items.push({ key: "web", icon: <Globe />, text: prettyUrl(p.website), href: isUrl(p.website) ? hrefFor(p.website) : undefined })
  if (p.linkedin) items.push({ key: "linkedin", icon: <Link2 />, text: prettyUrl(p.linkedin), href: isUrl(p.linkedin) ? hrefFor(p.linkedin) : undefined })
  return items
}

export function extraDetails(ctx: Ctx): { label: string; value: string }[] {
  const p = ctx.resume.personal
  const out: { label: string; value: string }[] = []
  const address = [p.address, p.postalCode].filter(Boolean).join(", ")
  if (address) out.push({ label: ctx.w.address, value: address })
  if (p.nationality) out.push({ label: ctx.w.nationality, value: p.nationality })
  if (p.dateOfBirth) out.push({ label: ctx.w.dateOfBirth, value: formatDate(p.dateOfBirth, "MM/YYYY", ctx.resume.locale) })
  if (p.placeOfBirth) out.push({ label: ctx.w.placeOfBirth, value: p.placeOfBirth })
  if (p.drivingLicense) out.push({ label: ctx.w.drivingLicense, value: p.drivingLicense })
  return out
}

/** Contact data on one wrapping line, with icons or separators. */
export function ContactLine({ ctx, separator = "|", className = "" }: { ctx: Ctx; separator?: string; className?: string }) {
  const items = contactItems(ctx)
  const details = extraDetails(ctx)
  if (!items.length && !details.length) return null
  const icons = ctx.s.contactIcons
  return (
    <div className={`cv-contact ${icons ? "cv-contact-icons" : "cv-contact-plain"} ${className}`}>
      {items.map((item, i) => (
        <span key={item.key} className="cv-contact-item">
          {!icons && i > 0 ? <span className="cv-sep">{separator}</span> : null}
          {icons ? item.icon : null}
          <A ctx={ctx} href={item.href}>
            {item.text}
          </A>
        </span>
      ))}
      {details.map((d, i) => (
        <span key={d.label} className="cv-contact-item">
          {!icons && (items.length > 0 || i > 0) ? <span className="cv-sep">{separator}</span> : null}
          <span className="cv-detail-label">{d.label}:</span> <span>{d.value}</span>
        </span>
      ))}
    </div>
  )
}

/** Contact data as a vertical list, for sidebars. */
export function ContactStack({ ctx, title }: { ctx: Ctx; title?: string }) {
  const items = contactItems(ctx)
  const details = extraDetails(ctx)
  if (!items.length && !details.length) return null
  return (
    <div className="cv-section cv-contact-stack">
      {title ? <h2 className="cv-section-title">{title}</h2> : null}
      {items.map((item) => (
        <div key={item.key} className="cv-contact-row">
          {ctx.s.contactIcons ? item.icon : null}
          <A ctx={ctx} href={item.href}>
            {item.text}
          </A>
        </div>
      ))}
      {details.map((d) => (
        <div key={d.label} className="cv-detail-row">
          <div className="cv-detail-label">{d.label}</div>
          <div>{d.value}</div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export type SectionOpts = {
  /** Narrow column: skills collapse to one column. */
  narrow?: boolean
  /** "inline" puts title and subtitle on one line, "stacked" uses two lines. */
  entry?: "inline" | "stacked"
  /** Put dates in a left gutter instead of next to the title. */
  dateGutter?: boolean
  /** Replace the default section title markup. */
  renderTitle?: (title: string, section: Section) => ReactNode
}

export function Sections({ ctx, sections, opts = {} }: { ctx: Ctx; sections: Section[]; opts?: SectionOpts }) {
  return (
    <>
      {sections.map((section) => (
        <SectionView key={section.id} ctx={ctx} section={section} opts={opts} />
      ))}
    </>
  )
}

export function SectionView({ ctx, section, opts = {} }: { ctx: Ctx; section: Section; opts?: SectionOpts }) {
  const title = sectionTitle(section, ctx.resume.locale)
  return (
    <section className={`cv-section cv-section-${section.kind}`} data-type={section.type}>
      {opts.renderTitle ? opts.renderTitle(title, section) : <h2 className="cv-section-title">{title}</h2>}
      <div className="cv-section-body">
        <SectionBody ctx={ctx} section={section} opts={opts} />
      </div>
    </section>
  )
}

export function SectionBody({ ctx, section, opts }: { ctx: Ctx; section: Section; opts: SectionOpts }) {
  switch (section.kind) {
    case "text":
      return <Rich ctx={ctx} html={section.html} />
    case "timeline":
      return <Timeline ctx={ctx} section={section} opts={opts} />
    case "skills":
      return <Skills ctx={ctx} section={section} opts={opts} />
    case "links":
      return <Links ctx={ctx} section={section} opts={opts} />
    case "references":
      return <References ctx={ctx} section={section} />
  }
}

export function Rich({ ctx, html }: { ctx: Ctx; html: string }) {
  if (isHtmlEmpty(html)) return null
  // Stored HTML is already clean. Sanitizing again costs little and protects old files.
  const safe = sanitizeHtml(html)
  const content = ctx.links ? safe : safe.replace(/<\/?a(\s[^>]*)?>/gi, "")
  return <div className="cv-rich" dangerouslySetInnerHTML={{ __html: content }} />
}

/** An anchor, or a plain span when links are off. */
function A({ ctx, href, className, children }: { ctx: Ctx; href?: string; className?: string; children: ReactNode }) {
  if (href && ctx.links) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return <span className={className}>{children}</span>
}

function entryParts(ctx: Ctx, section: Section, item: TimelineItem) {
  const swap = section.type === "education" && ctx.s.educationFirst === "institution"
  return {
    title: swap ? item.subtitle : item.title,
    subtitle: swap ? item.title : item.subtitle,
  }
}

function Timeline({ ctx, section, opts }: { ctx: Ctx; section: SectionOf<"timeline">; opts: SectionOpts }) {
  const items = section.items.filter((i) => i.title.trim() || i.subtitle.trim() || !isHtmlEmpty(i.description))
  const entry = opts.entry ?? "inline"
  return (
    <>
      {items.map((item) => {
        const { title, subtitle } = entryParts(ctx, section, item)
        const dates = formatRange(item.startDate, item.endDate, item.current, ctx.s.dateFormat, ctx.resume.locale)
        const right = ctx.s.dateAlign === "right" && !opts.dateGutter
        const head =
          entry === "inline" ? (
            <div className="cv-item-heading">
              {title ? <span className="cv-item-title">{title}</span> : null}
              {subtitle ? (
                <span className="cv-item-sub">
                  {title ? ", " : ""}
                  {subtitle}
                </span>
              ) : null}
              {item.city ? <span className="cv-item-city">, {item.city}</span> : null}
            </div>
          ) : (
            <div className="cv-item-heading">
              {title ? <div className="cv-item-title">{title}</div> : null}
              {subtitle || item.city ? (
                <div className="cv-item-sub">{[subtitle, item.city].filter(Boolean).join(" · ")}</div>
              ) : null}
            </div>
          )
        return (
          <div key={item.id} className={`cv-item ${opts.dateGutter ? "cv-item-gutter" : ""}`}>
            {opts.dateGutter ? <div className="cv-item-date cv-gutter-date">{dates}</div> : null}
            <div className="cv-item-main">
              <div className="cv-item-head">
                {head}
                {right && dates ? <div className="cv-item-date">{dates}</div> : null}
              </div>
              {!right && !opts.dateGutter && dates ? <div className="cv-item-date cv-item-date-inline">{dates}</div> : null}
              {!isHtmlEmpty(item.description) ? (
                <div className="cv-item-body">
                  <Rich ctx={ctx} html={item.description} />
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </>
  )
}

function LevelDots({ level }: { level: number }) {
  return (
    <span className="cv-dots" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= level ? "on" : ""} />
      ))}
    </span>
  )
}

function Skills({ ctx, section, opts }: { ctx: Ctx; section: SectionOf<"skills">; opts: SectionOpts }) {
  const preset = getPreset(section.type)
  const items = section.items.filter((i) => i.name.trim())
  const labels = preset.languageLevels ? ctx.w.languageLevels : ctx.w.skillLevels
  const showLevel = section.showLevel
  const layout = ctx.s.skillsLayout
  // Languages are always written out. Skills follow the setting.
  const asText = preset.languageLevels || ctx.s.skillLevelStyle === "text"

  if (layout === "inline") {
    return (
      <div className="cv-skills-inline">
        {items.map((item, i) => (
          <span key={item.id}>
            {i > 0 ? <span className="cv-sep"> {ctx.s.skillsDivider === "," ? "" : ctx.s.skillsDivider} </span> : null}
            {item.name}
            {ctx.s.skillsDivider === "," && i < items.length - 1 ? "," : ""}
            {showLevel && asText && item.level > 0 ? (
              <span className="cv-skill-level"> ({labels[item.level - 1]})</span>
            ) : null}
          </span>
        ))}
      </div>
    )
  }

  if (layout === "bars") {
    return (
      <div className="cv-skills-bars">
        {items.map((item) => (
          <div key={item.id} className="cv-skill-bar">
            <div className="cv-skill-name">
              <span>{item.name}</span>
              {showLevel && item.level > 0 ? <span className="cv-skill-level">{labels[item.level - 1]}</span> : null}
            </div>
            {showLevel && item.level > 0 ? (
              <div className="cv-bar">
                <span style={{ width: `${item.level * 20}%` }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  const cols = opts.narrow ? 1 : ctx.s.skillsColumns
  return (
    <div className="cv-skills-cols" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <div key={item.id} className="cv-skill">
          <span className="cv-skill-name">{item.name}</span>
          {showLevel && item.level > 0 ? (
            asText ? (
              <span className="cv-skill-level">{labels[item.level - 1]}</span>
            ) : (
              <LevelDots level={item.level} />
            )
          ) : null}
        </div>
      ))}
    </div>
  )
}

function Links({ ctx, section, opts }: { ctx: Ctx; section: SectionOf<"links">; opts: SectionOpts }) {
  const items = section.items.filter((i) => i.url.trim())
  return (
    <div className={opts.narrow ? "cv-links cv-links-stack" : "cv-links"}>
      {items.map((item) => (
        <A key={item.id} ctx={ctx} href={hrefFor(item.url)} className="cv-link">
          {item.label ? <span className="cv-link-label">{item.label}</span> : null}
          <span className="cv-link-url">{prettyUrl(item.url)}</span>
        </A>
      ))}
    </div>
  )
}

function References({ ctx, section }: { ctx: Ctx; section: SectionOf<"references"> }) {
  if (section.onRequest) return <p>{ctx.w.referencesOnRequest}</p>
  return (
    <div className="cv-refs">
      {section.items
        .filter((i) => i.name.trim())
        .map((item) => (
          <div key={item.id} className="cv-item">
            <div className="cv-item-title">
              {item.name}
              {item.company ? <span className="cv-item-sub">, {item.company}</span> : null}
            </div>
            <div className="cv-item-date cv-item-date-inline">
              {[item.email, item.phone].filter(Boolean).join(" · ")}
            </div>
          </div>
        ))}
    </div>
  )
}
