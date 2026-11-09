import { csvRecords, type CsvRecord } from "./csv"
import { createSection, createSkillItem, createTimelineItem, newId } from "./defaults"
import { languageLevel, rich } from "./json-resume"
import type { Resume, Section, TimelineItem } from "./schema"

/*
 * LinkedIn's "Get a copy of your data" archive as a cvfree resume. The archive
 * is a zip of CSV files, one for each part of the profile. Only the parts that
 * belong on a resume are read. Messages, connections and the rest are ignored.
 */

/** The files this importer reads, by their name in the archive, in lower case. */
export const LINKEDIN_FILES = [
  "profile.csv",
  "positions.csv",
  "education.csv",
  "skills.csv",
  "languages.csv",
  "certifications.csv",
  "projects.csv",
  "honors.csv",
  "publications.csv",
  "volunteering.csv",
  "courses.csv",
  "email addresses.csv",
  "phonenumbers.csv",
] as const

/** Without one of these the zip holds no profile, whatever else is in it. */
const PROFILE_FILES = ["profile.csv", "positions.csv", "education.csv"]

const MONTHS: [RegExp, string][] = [
  [/^(jan|ene)/, "01"],
  [/^(feb|fev)/, "02"],
  [/^mar/, "03"],
  [/^(apr|abr|avr)/, "04"],
  [/^(may|mai)/, "05"],
  [/^(jun|juin)/, "06"],
  [/^(jul|juil)/, "07"],
  [/^(aug|ago|aou)/, "08"],
  [/^(sep|set)/, "09"],
  [/^(oct|out|okt)/, "10"],
  [/^nov/, "11"],
  [/^(dec|dez|dic)/, "12"],
]

/**
 * "Jan 2020" and "Jan 5, 2020" become "2020-01", "2020" stays. The archive
 * writes month names in English. The short names of a few other languages are
 * understood too, in case that changes with the account language.
 */
export function linkedinDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})/.exec(value.trim())
  if (iso) return `${iso[1]}-${iso[2]}`
  const year = /\b(?:19|20)\d{2}\b/.exec(value)?.[0]
  if (!year) return ""
  const plain = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
  const word = /[a-z]{3,}/.exec(plain)?.[0] ?? ""
  const month = MONTHS.find(([name]) => name.test(word))?.[1]
  return month ? `${year}-${month}` : year
}

/** "[COMPANY:https://acme.example,PERSONAL:https://me.example]" as labelled addresses. */
function websites(value: string) {
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const labelled = /^([A-Za-z_ ]+):\s*(\S.*)$/.exec(part)
      if (!labelled || /^https?$/i.test(labelled[1])) return { label: "", url: part }
      const label = labelled[1].replace(/_/g, " ").trim().toLowerCase()
      return { label: label === "other" ? "" : label.charAt(0).toUpperCase() + label.slice(1), url: labelled[2].trim() }
    })
}

/** "Porto, Porto District, Portugal" as a city and a country. A single name, such as "Greater Lisbon Area", is kept as the city. */
function place(value: string) {
  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length < 2) return { city: parts[0] ?? "", country: "" }
  const before = parts.slice(0, -1).filter((p, i, all) => all.indexOf(p) === i)
  return { city: before.join(", "), country: parts[parts.length - 1] }
}

const BULLET = /^\s*[-*•]\s+/

/**
 * People write a line of text and the bullets right under it. A blank line goes
 * in where the two meet, so the bullets become a list of their own.
 */
function splitBullets(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  return lines
    .map((line, i) => {
      const before = lines[i - 1] ?? ""
      const meets = before.trim() !== "" && line.trim() !== "" && BULLET.test(before) !== BULLET.test(line)
      return meets ? `\n${line}` : line
    })
    .join("\n")
}

/**
 * The CSV files of a LinkedIn archive as a cvfree resume, or null when they
 * hold no profile. `files` maps a file name in lower case to its text. `base`
 * brings the id, the language and the look, and its empty sections are filled
 * in. The caller still runs the result through normalizeResume.
 */
export function fromLinkedin(files: Map<string, string>, base: Resume): Resume | null {
  if (!PROFILE_FILES.some((name) => files.has(name))) return null

  const rows = (file: string, column: string) => csvRecords(files.get(file) ?? "", column)
  const cell = (row: CsvRecord | undefined, column: string) => row?.get(column.toLowerCase()) ?? ""

  const sections: Section[] = base.sections.map((s) => structuredClone(s))
  const get = (type: string) => {
    let section = sections.find((s) => s.type === type)
    if (!section) {
      section = createSection(type)
      sections.push(section)
    }
    return section
  }
  let entries = 0
  const addEntries = (type: string, items: TimelineItem[]) => {
    const kept = items.filter((i) => i.title || i.subtitle)
    if (!kept.length) return
    const section = get(type)
    if (section.kind === "timeline") section.items.push(...kept)
    entries += kept.length
  }
  /** An entry with a start and no end is still going on. */
  const range = (row: CsvRecord, start = "Started On", end = "Finished On") => {
    const startDate = linkedinDate(cell(row, start))
    const endDate = linkedinDate(cell(row, end))
    return { startDate, endDate, current: Boolean(startDate) && !endDate }
  }
  const paragraphs = (...parts: string[]) => rich(parts.filter(Boolean).map(splitBullets).join("\n\n"))

  const profile = rows("profile.csv", "First Name")[0]
  const firstName = cell(profile, "First Name")
  const lastName = cell(profile, "Last Name")
  const sites = websites(cell(profile, "Websites"))
  const { city, country } = place(cell(profile, "Geo Location"))

  const emails = rows("email addresses.csv", "Email Address")
  const email = emails.find((e) => /^yes$/i.test(cell(e, "Primary"))) ?? emails.find((e) => /^yes$/i.test(cell(e, "Confirmed"))) ?? emails[0]
  const phone = rows("phonenumbers.csv", "Number").find((p) => cell(p, "Number"))

  const summary = paragraphs(cell(profile, "Summary"))
  if (summary) {
    const section = get("summary")
    if (section.kind === "text") section.html = summary
  }

  addEntries(
    "experience",
    rows("positions.csv", "Company Name").map((p) =>
      createTimelineItem({
        title: cell(p, "Title"),
        subtitle: cell(p, "Company Name"),
        city: cell(p, "Location"),
        ...range(p),
        description: paragraphs(cell(p, "Description")),
      })
    )
  )
  addEntries(
    "education",
    rows("education.csv", "School Name").map((e) =>
      createTimelineItem({
        title: cell(e, "Degree Name"),
        subtitle: cell(e, "School Name"),
        startDate: linkedinDate(cell(e, "Start Date")),
        endDate: linkedinDate(cell(e, "End Date")),
        description: paragraphs(cell(e, "Notes"), cell(e, "Activities")),
      })
    )
  )
  addEntries(
    "certifications",
    rows("certifications.csv", "Authority").map((c) => {
      const { startDate, endDate } = range(c)
      return createTimelineItem({ title: cell(c, "Name"), subtitle: cell(c, "Authority"), startDate, endDate, description: paragraphs(cell(c, "Url")) })
    })
  )
  addEntries(
    "projects",
    rows("projects.csv", "Title").map((x) => {
      const { startDate, endDate } = range(x)
      return createTimelineItem({ title: cell(x, "Title"), startDate, endDate, description: paragraphs(cell(x, "Description"), cell(x, "Url")) })
    })
  )
  addEntries(
    "awards",
    rows("honors.csv", "Title").map((h) =>
      createTimelineItem({ title: cell(h, "Title"), startDate: linkedinDate(cell(h, "Issued On")), description: paragraphs(cell(h, "Description")) })
    )
  )
  addEntries(
    "publications",
    rows("publications.csv", "Name").map((x) =>
      createTimelineItem({
        title: cell(x, "Name"),
        subtitle: cell(x, "Publisher"),
        startDate: linkedinDate(cell(x, "Published On")),
        description: paragraphs(cell(x, "Description"), cell(x, "Url")),
      })
    )
  )
  addEntries(
    "volunteering",
    rows("volunteering.csv", "Company Name").map((v) =>
      createTimelineItem({
        title: cell(v, "Role"),
        subtitle: cell(v, "Company Name"),
        ...range(v),
        description: paragraphs(cell(v, "Description")),
      })
    )
  )
  addEntries(
    "courses",
    rows("courses.csv", "Name").map((c) => createTimelineItem({ title: cell(c, "Name") }))
  )

  // LinkedIn has no skill levels, so they come in unrated.
  const names = new Map<string, string>()
  for (const row of rows("skills.csv", "Name")) {
    const name = cell(row, "Name")
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name)
  }
  const skills = [...names.values()].map((name) => createSkillItem({ name, level: 0 }))
  if (skills.length) {
    const section = get("skills")
    if (section.kind === "skills") section.items.push(...skills)
  }
  const languages = rows("languages.csv", "Name")
    .filter((l) => cell(l, "Name"))
    .map((l) => createSkillItem({ name: cell(l, "Name"), level: languageLevel(cell(l, "Proficiency")) }))
  if (languages.length) {
    const section = get("languages")
    if (section.kind === "skills") section.items.push(...languages)
  }

  // The first address is the website on the header. The others go to the links section.
  const links = sites.slice(1).map((s) => ({ id: newId(), label: s.label, url: s.url }))
  if (links.length) {
    const section = get("links")
    if (section.kind === "links") section.items.push(...links)
  }

  if (!firstName && !lastName && !summary && entries === 0 && skills.length === 0) return null

  return {
    ...base,
    title: "Imported from LinkedIn",
    personal: {
      ...base.personal,
      jobTitle: cell(profile, "Headline"),
      firstName,
      lastName,
      email: cell(email, "Email Address"),
      phone: cell(phone, "Number"),
      website: sites[0]?.url ?? "",
      address: cell(profile, "Address"),
      postalCode: cell(profile, "Zip Code"),
      city,
      country,
    },
    sections,
  }
}
