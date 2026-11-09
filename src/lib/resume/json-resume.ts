import { createSection, createSkillItem, createTimelineItem, newId } from "./defaults"
import { fullName, hrefFor, htmlToText, isUrl, prettyUrl } from "./format"
import { WORDS } from "./i18n"
import { getPreset } from "./presets"
import { textToHtml } from "./text-to-html"
import type { Resume, Section, TimelineItem } from "./schema"

/*
 * JSON Resume (jsonresume.org, schema v1.0.0) in and out. It is the open format
 * other resume tools read, so it is the way to move a resume between products.
 * It holds content only. Template, colors and spacing stay in the cvfree backup.
 */

type Json = Record<string, unknown>

const SCHEMA_URL = "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json"

const isEmpty = (v: unknown) =>
  v === "" ||
  v == null ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0)

/** Drop empty strings, lists and objects, so the file only says what it knows. */
const clean = (obj: Json): Json => Object.fromEntries(Object.entries(obj).filter(([, v]) => !isEmpty(v)))

const textLines = (html: string) =>
  htmlToText(html)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

/** Rich text as plain text. A blank line sits between paragraphs, and the bullets of one list stay on consecutive lines. */
function plain(html: string) {
  const lines = textLines(html)
  return lines
    .map((line, i) => (i === 0 ? "" : line.startsWith("•") && lines[i - 1].startsWith("•") ? "\n" : "\n\n") + line)
    .join("")
}

/** Paragraphs become the summary and bullets become highlights. */
function splitDescription(html: string) {
  const summary: string[] = []
  const highlights: string[] = []
  for (const line of textLines(html)) {
    if (line.startsWith("•")) highlights.push(line.replace(/^•\s*/, ""))
    else summary.push(line)
  }
  return { summary: summary.join("\n\n"), highlights }
}

/** A web address on the last line of the text moves to the entry's own url field. */
function pullUrl(text: string) {
  const lines = text.split("\n")
  const last = lines[lines.length - 1]?.trim() ?? ""
  if (!/^https?:\/\/\S+$/i.test(last)) return { text, url: "" }
  return { text: lines.slice(0, -1).join("\n").trim(), url: last }
}

/** The last part of a profile address, e.g. "alex-moreau" in linkedin.com/in/alex-moreau. */
function handle(url: string) {
  const parts = prettyUrl(url.trim()).split(/[/?#]/).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

export function toJsonResume(resume: Resume): Json {
  const p = resume.personal
  const words = WORDS[resume.locale]
  const visible = resume.sections.filter((s) => !s.hidden)

  const entries = (...types: string[]) =>
    visible
      .flatMap((s) => (s.kind === "timeline" && types.includes(s.type) ? s.items : []))
      .filter((i) => i.title.trim() || i.subtitle.trim())
  const text = (type: string) =>
    visible
      .flatMap((s) => (s.kind === "text" && s.type === type ? [plain(s.html)] : []))
      .filter(Boolean)
      .join("\n\n")
  const range = (i: TimelineItem) => ({ startDate: i.startDate, endDate: i.current ? "" : i.endDate })
  const day = (i: TimelineItem) => i.endDate || i.startDate

  const country = p.country.trim()
  const profiles = [
    ...(p.linkedin.trim() ? [{ label: "LinkedIn", url: p.linkedin }] : []),
    ...visible.flatMap((s) => (s.kind === "links" ? s.items : [])).filter((i) => i.url.trim()),
  ].map((i) => {
    const url = i.url.trim()
    // Something like "@name@example.social" is a handle, not an address.
    if (url.startsWith("@") || !isUrl(url)) return clean({ network: i.label.trim(), username: url })
    return clean({ network: i.label.trim() || prettyUrl(url).split("/")[0], username: handle(url), url: hrefFor(url) })
  })

  const skillSections = visible.flatMap((s) => (s.kind === "skills" ? [s] : []))
  const skills = skillSections
    .filter((s) => !getPreset(s.type).languageLevels)
    .flatMap((s) =>
      s.items
        .filter((i) => i.name.trim())
        .map((i) => clean({ name: i.name.trim(), level: s.showLevel && i.level > 0 ? words.skillLevels[i.level - 1] : "" }))
    )
  const languages = skillSections
    .filter((s) => getPreset(s.type).languageLevels)
    .flatMap((s) =>
      s.items
        .filter((i) => i.name.trim())
        .map((i) => clean({ language: i.name.trim(), fluency: s.showLevel && i.level > 0 ? words.languageLevels[i.level - 1] : "" }))
    )

  return clean({
    $schema: SCHEMA_URL,
    basics: clean({
      name: fullName(resume),
      label: p.jobTitle.trim(),
      image: p.photo ?? "",
      email: p.email.trim(),
      phone: p.phone.trim(),
      url: p.website.trim() ? hrefFor(p.website.trim()) : "",
      summary: text("summary"),
      location: clean({
        address: p.address.trim(),
        postalCode: p.postalCode.trim(),
        city: p.city.trim(),
        // The format wants a two-letter code. A country written in full goes to region, which themes print as is.
        ...(/^[A-Za-z]{2}$/.test(country) ? { countryCode: country.toUpperCase() } : { region: country }),
      }),
      profiles,
    }),
    work: entries("experience", "internships").map((i) =>
      clean({ name: i.subtitle, position: i.title, location: i.city, ...range(i), ...splitDescription(i.description) })
    ),
    volunteer: entries("volunteering").map((i) =>
      clean({ organization: i.subtitle, position: i.title, ...range(i), ...splitDescription(i.description) })
    ),
    education: entries("education").map((i) => {
      const { summary, highlights } = splitDescription(i.description)
      return clean({ institution: i.subtitle, area: i.title, ...range(i), summary, courses: highlights })
    }),
    awards: entries("awards").map((i) => clean({ title: i.title, date: day(i), awarder: i.subtitle, summary: plain(i.description) })),
    certificates: entries("certifications", "courses").map((i) =>
      clean({ name: i.title, date: day(i), issuer: i.subtitle, url: pullUrl(plain(i.description)).url })
    ),
    publications: entries("publications").map((i) => {
      const { text: summary, url } = pullUrl(plain(i.description))
      return clean({ name: i.title, publisher: i.subtitle, releaseDate: day(i), url, summary })
    }),
    skills,
    languages,
    interests: text("hobbies")
      .split(/[,\n•]/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name })),
    references: visible
      .flatMap((s) => (s.kind === "references" && !s.onRequest ? s.items : []))
      .filter((r) => r.name.trim())
      .map((r) => clean({ name: r.name.trim(), reference: [r.company, r.email, r.phone].map((v) => v.trim()).filter(Boolean).join(", ") })),
    projects: entries("projects").map((i) => {
      const { summary, highlights } = splitDescription(i.description)
      const { text: description, url } = pullUrl(summary)
      return clean({ name: i.title, entity: i.subtitle, ...range(i), description, highlights, url })
    }),
    meta: { version: "v1.0.0", lastModified: resume.updatedAt.slice(0, 19) },
  })
}

/* ---------- import ---------- */

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {})
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.map(obj).filter((x) => Object.keys(x).length > 0) : [])
const strings = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

/** "2020-03-15" and "2020-03" become "2020-03", "2020" stays, anything else is dropped. */
const month = (v: unknown) => /^(\d{4})(?:-(\d{2}))?/.exec(str(v))?.[0] ?? ""

const rich = (summary: string, highlights: string[] = []) =>
  textToHtml([summary, highlights.map((h) => `- ${h.replace(/\s*\n\s*/g, " ")}`).join("\n")].filter(Boolean).join("\n\n"))

/** Level words to the 1 to 5 scale. Knows this app's own labels in every language, plus the usual English ones. */
function levelTable(key: "skillLevels" | "languageLevels", extra: Record<string, number>) {
  const table = new Map(Object.entries(extra))
  for (const words of Object.values(WORDS)) words[key].forEach((label, i) => table.set(label.toLowerCase(), i + 1))
  const byLength = [...table.entries()].sort((a, b) => b[0].length - a[0].length)
  return (value: unknown) => {
    const v = str(value).toLowerCase()
    if (!v) return 0
    return table.get(v) ?? byLength.find(([label]) => label.length > 2 && v.includes(label))?.[1] ?? 0
  }
}

const skillLevel = levelTable("skillLevels", { master: 5, advanced: 4, intermediate: 3, basic: 1 })
const languageLevel = levelTable("languageLevels", {
  bilingual: 5,
  "mother tongue": 5,
  "full professional": 4,
  advanced: 4,
  "professional working": 3,
  intermediate: 2,
  "limited working": 2,
  elementary: 1,
  beginner: 1,
  c2: 5,
  c1: 4,
  b2: 3,
  b1: 2,
  a2: 1,
  a1: 1,
})

/** True for a JSON Resume file, false for a cvfree backup or anything else. */
export function isJsonResume(data: unknown): boolean {
  const d = obj(data)
  if (Array.isArray(d.sections) || Object.keys(obj(d.personal)).length) return false
  return Object.keys(obj(d.basics)).length > 0 || ["work", "education", "skills", "projects"].some((k) => Array.isArray(d[k]))
}

/**
 * A JSON Resume file as a cvfree resume. `base` brings the id, the language and
 * the look, and its empty sections are filled in. The caller still runs the
 * result through normalizeResume, which cleans the rich text.
 */
export function fromJsonResume(data: Json, base: Resume): Resume {
  const basics = obj(data.basics)
  const location = obj(basics.location)
  const [firstName = "", ...rest] = str(basics.name).split(/\s+/)
  const profiles = list(basics.profiles)
  const isLinkedin = (p: Json) => /linkedin/i.test(`${str(p.network)} ${str(p.url)}`)
  const linkedin = profiles.find(isLinkedin)
  const image = str(basics.image)
  const region = str(location.region)
  const countryCode = str(location.countryCode)

  const sections: Section[] = base.sections.map((s) => structuredClone(s))
  const get = (type: string) => {
    let section = sections.find((s) => s.type === type)
    if (!section) {
      section = createSection(type)
      sections.push(section)
    }
    return section
  }
  const setText = (type: string, html: string) => {
    if (!html) return
    const section = get(type)
    if (section.kind === "text") section.html = html
  }
  const addEntries = (type: string, items: TimelineItem[]) => {
    const kept = items.filter((i) => i.title || i.subtitle)
    if (!kept.length) return
    const section = get(type)
    if (section.kind === "timeline") section.items.push(...kept)
  }
  /** An entry with a start and no end is still going on. */
  const range = (x: Json) => {
    const startDate = month(x.startDate)
    const endDate = month(x.endDate)
    return { startDate, endDate, current: Boolean(startDate) && !endDate }
  }
  const withUrl = (text: string, url: unknown) => [text, str(url)].filter(Boolean).join("\n\n")

  setText("summary", rich(str(basics.summary)))

  addEntries(
    "experience",
    list(data.work).map((w) =>
      createTimelineItem({
        title: str(w.position),
        subtitle: str(w.name) || str(w.company),
        city: str(w.location),
        ...range(w),
        description: rich(str(w.summary), strings(w.highlights)),
      })
    )
  )
  addEntries(
    "education",
    list(data.education).map((e) =>
      createTimelineItem({
        title: [str(e.studyType), str(e.area)].filter(Boolean).join(", "),
        subtitle: str(e.institution),
        startDate: month(e.startDate),
        endDate: month(e.endDate),
        description: rich([str(e.score), str(e.summary)].filter(Boolean).join("\n\n"), strings(e.courses)),
      })
    )
  )
  addEntries(
    "projects",
    list(data.projects).map((x) =>
      createTimelineItem({
        title: str(x.name),
        subtitle: str(x.entity) || strings(x.roles).join(", "),
        startDate: month(x.startDate),
        endDate: month(x.endDate),
        description: rich(withUrl(str(x.description), x.url), strings(x.highlights)),
      })
    )
  )
  addEntries(
    "certifications",
    list(data.certificates).map((c) =>
      createTimelineItem({ title: str(c.name), subtitle: str(c.issuer), startDate: month(c.date), description: rich(str(c.url)) })
    )
  )
  addEntries(
    "awards",
    list(data.awards).map((a) =>
      createTimelineItem({ title: str(a.title), subtitle: str(a.awarder), startDate: month(a.date), description: rich(str(a.summary)) })
    )
  )
  addEntries(
    "publications",
    list(data.publications).map((x) =>
      createTimelineItem({
        title: str(x.name),
        subtitle: str(x.publisher),
        startDate: month(x.releaseDate),
        description: rich(withUrl(str(x.summary), x.url)),
      })
    )
  )
  addEntries(
    "volunteering",
    list(data.volunteer).map((v) =>
      createTimelineItem({
        title: str(v.position),
        subtitle: str(v.organization),
        ...range(v),
        description: rich(str(v.summary), strings(v.highlights)),
      })
    )
  )

  // A skill with keywords is a group ("Web development": HTML, CSS). Each keyword becomes a skill of its own.
  const skills = list(data.skills).flatMap((k) => {
    const name = str(k.name)
    const level = skillLevel(k.level)
    const keywords = strings(k.keywords)
    if (keywords.length) return keywords.map((keyword) => createSkillItem({ name: keyword, level, category: name }))
    return name ? [createSkillItem({ name, level })] : []
  })
  if (skills.length) {
    const section = get("skills")
    if (section.kind === "skills") section.items.push(...skills)
  }
  const languages = list(data.languages)
    .filter((l) => str(l.language))
    .map((l) => createSkillItem({ name: str(l.language), level: languageLevel(l.fluency) }))
  if (languages.length) {
    const section = get("languages")
    if (section.kind === "skills") section.items.push(...languages)
  }

  const links = profiles
    .filter((p) => p !== linkedin && (str(p.url) || str(p.username)))
    .map((p) => ({ id: newId(), label: str(p.network), url: str(p.url) || str(p.username) }))
  if (links.length) {
    const section = get("links")
    if (section.kind === "links") section.items.push(...links)
  }

  setText(
    "hobbies",
    rich(
      list(data.interests)
        .map((i) => str(i.name))
        .filter(Boolean)
        .join(", ")
    )
  )

  const references = list(data.references)
    .filter((r) => str(r.name))
    // The quote itself has no field here. A short one (a company or a role) fits next to the name.
    .map((r) => ({ id: newId(), name: str(r.name), company: str(r.reference).length <= 80 ? str(r.reference) : "", email: "", phone: "" }))
  if (references.length) {
    const section = get("references")
    if (section.kind === "references") section.items.push(...references)
  }

  return {
    ...base,
    title: "Imported resume",
    personal: {
      ...base.personal,
      jobTitle: str(basics.label),
      firstName,
      lastName: rest.join(" "),
      email: str(basics.email),
      phone: str(basics.phone),
      website: str(basics.url) || str(basics.website),
      linkedin: linkedin ? str(linkedin.url) || `linkedin.com/in/${str(linkedin.username)}` : "",
      address: str(location.address),
      postalCode: str(location.postalCode),
      city: countryCode && region ? [str(location.city), region].filter(Boolean).join(", ") : str(location.city),
      country: countryCode || region,
      // Only an embedded picture comes along. A remote address would be fetched by the PDF renderer.
      photo: /^data:image\/(png|jpe?g|webp);base64,/i.test(image) ? image : null,
    },
    sections,
  }
}
