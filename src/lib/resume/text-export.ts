import { formatRange, fullName, htmlToText, prettyUrl, sectionTitle } from "./format"
import { WORDS } from "./i18n"
import { getPreset } from "./presets"
import type { Resume } from "./schema"
import { hasContent } from "@/templates/blocks"

/** Plain text version of the resume, handy for pasting into job portals. */
export function resumeToText(resume: Resume): string {
  const s = resume.settings
  const words = WORDS[resume.locale]
  const p = resume.personal
  const lines: string[] = []
  lines.push(fullName(resume) || "Your Name")
  if (p.jobTitle) lines.push(p.jobTitle)
  const contact = [
    [p.city, p.country].filter(Boolean).join(", "),
    p.email,
    p.phone,
    prettyUrl(p.website),
    prettyUrl(p.linkedin),
  ].filter(Boolean)
  if (contact.length) lines.push(contact.join(" | "))

  for (const section of resume.sections.filter(hasContent)) {
    const title = sectionTitle(section, resume.locale)
    lines.push("", title.toUpperCase(), "-".repeat(Math.min(title.length, 60)))
    switch (section.kind) {
      case "text":
        lines.push(htmlToText(section.html))
        break
      case "timeline":
        section.items.forEach((item, i) => {
          if (i) lines.push("")
          lines.push([item.title, item.subtitle, item.city].filter(Boolean).join(", "))
          const dates = formatRange(item.startDate, item.endDate, item.current, s.dateFormat, resume.locale)
          if (dates) lines.push(dates)
          const desc = htmlToText(item.description)
          if (desc) lines.push(desc)
        })
        break
      case "skills": {
        const labels = getPreset(section.type).languageLevels ? words.languageLevels : words.skillLevels
        for (const item of section.items.filter((i) => i.name.trim())) {
          lines.push(`• ${item.name}${section.showLevel && item.level > 0 ? ` (${labels[item.level - 1]})` : ""}`)
        }
        break
      }
      case "links":
        for (const item of section.items.filter((i) => i.url.trim())) {
          lines.push(`${item.label ? `${item.label}: ` : ""}${prettyUrl(item.url)}`)
        }
        break
      case "references":
        if (section.onRequest) lines.push(words.referencesOnRequest)
        else
          for (const r of section.items.filter((i) => i.name.trim())) {
            lines.push([r.name, r.company, r.email, r.phone].filter(Boolean).join(", "))
          }
        break
    }
  }
  return lines.join("\n").trim() + "\n"
}
