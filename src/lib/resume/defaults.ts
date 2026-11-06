import { nanoid } from "nanoid"

import { getPreset } from "./presets"
import { sanitizeHtml } from "./sanitize"
import {
  personalSchema,
  resumeSchema,
  sectionSchema,
  settingsSchema,
  type Locale,
  type Resume,
  type ResumeSettings,
  type Section,
  type SkillItem,
  type TimelineItem,
} from "./schema"

export const newId = () => nanoid(10)

export function defaultSettings(overrides: Partial<ResumeSettings> = {}): ResumeSettings {
  return { ...settingsSchema.parse({}), ...overrides }
}

export function createSection(type: string): Section {
  const preset = getPreset(type)
  const base = { id: newId(), type: preset.type, title: "", hidden: false, column: "auto" as const }
  switch (preset.kind) {
    case "text":
      return { ...base, kind: "text", html: "" }
    case "timeline":
      return { ...base, kind: "timeline", items: [] }
    case "skills":
      return { ...base, kind: "skills", showLevel: true, items: [] }
    case "links":
      return { ...base, kind: "links", items: [] }
    case "references":
      return { ...base, kind: "references", onRequest: false, items: [] }
  }
}

export function createTimelineItem(partial: Partial<TimelineItem> = {}): TimelineItem {
  return {
    id: newId(),
    title: "",
    subtitle: "",
    city: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
    ...partial,
  }
}

export function createSkillItem(partial: Partial<SkillItem> = {}): SkillItem {
  return { id: newId(), name: "", level: 3, category: "", ...partial }
}

const DEFAULT_SECTIONS = ["summary", "experience", "education", "skills", "languages", "links"]

export function emptyResume(
  opts: { title?: string; locale?: Locale; settings?: Partial<ResumeSettings> } = {}
): Resume {
  const now = new Date().toISOString()
  return {
    id: newId(),
    title: opts.title ?? "Untitled resume",
    locale: opts.locale ?? "en",
    createdAt: now,
    updatedAt: now,
    personal: personalSchema.parse({}),
    sections: DEFAULT_SECTIONS.map(createSection),
    settings: defaultSettings(opts.settings),
    shareToken: null,
  }
}

/** A fictional person used for "start from an example" and template thumbnails. */
export function sampleResume(opts: { locale?: Locale; settings?: Partial<ResumeSettings> } = {}): Resume {
  const resume = emptyResume({ title: "Example resume", ...opts })
  resume.personal = {
    ...resume.personal,
    jobTitle: "Senior Product Engineer",
    firstName: "Alex",
    lastName: "Moreau",
    email: "alex.moreau@example.com",
    phone: "+351 900 000 000",
    website: "alexmoreau.dev",
    linkedin: "linkedin.com/in/alex-moreau",
    city: "Lisbon",
    country: "Portugal",
  }
  resume.sections = resume.sections.map((section): Section => {
    switch (section.type) {
      case "summary":
        return section.kind === "text"
          ? {
              ...section,
              html: "<p>Product engineer with 9 years of experience building web platforms for fintech and travel companies. Ships end-to-end features with TypeScript, React and Node.js, and cares about clean APIs, fast pages and teams that write things down.</p>",
            }
          : section
      case "experience":
        return section.kind === "timeline"
          ? {
              ...section,
              items: [
                createTimelineItem({
                  title: "Senior Product Engineer",
                  subtitle: "Northwind Payments",
                  city: "Lisbon",
                  startDate: "2022-03",
                  current: true,
                  description:
                    "<ul><li><p>Led the rebuild of the merchant dashboard in Next.js, cutting page load time by 48%.</p></li><li><p>Designed a typed API layer shared by web and mobile, removing a class of runtime errors.</p></li><li><p>Mentored four engineers and set up the team's review and release checklist.</p></li></ul>",
                }),
                createTimelineItem({
                  title: "Full-Stack Engineer",
                  subtitle: "Bluefin Travel",
                  city: "Porto",
                  startDate: "2018-06",
                  endDate: "2022-02",
                  description:
                    "<ul><li><p>Built the booking flow used by 2M travellers a year with React and GraphQL.</p></li><li><p>Moved deployments to containers and CI pipelines, from weekly releases to daily.</p></li></ul>",
                }),
                createTimelineItem({
                  title: "Software Developer",
                  subtitle: "Atelier Digital",
                  city: "Lyon",
                  startDate: "2015-09",
                  endDate: "2018-05",
                  description:
                    "<p>Delivered client web apps for retail and media brands, from first sketch to production.</p>",
                }),
              ],
            }
          : section
      case "education":
        return section.kind === "timeline"
          ? {
              ...section,
              items: [
                createTimelineItem({
                  title: "MSc Computer Science",
                  subtitle: "University of Lyon",
                  city: "Lyon",
                  startDate: "2013-09",
                  endDate: "2015-07",
                }),
              ],
            }
          : section
      case "skills":
        return section.kind === "skills"
          ? {
              ...section,
              items: [
                ["TypeScript", 5],
                ["React / Next.js", 5],
                ["Node.js", 4],
                ["PostgreSQL", 4],
                ["GraphQL", 4],
                ["Docker / CI", 3],
              ].map(([name, level]) => createSkillItem({ name: String(name), level: Number(level) })),
            }
          : section
      case "languages":
        return section.kind === "skills"
          ? {
              ...section,
              items: [
                createSkillItem({ name: "French", level: 5 }),
                createSkillItem({ name: "English", level: 4 }),
                createSkillItem({ name: "Portuguese", level: 3 }),
              ],
            }
          : section
      case "links":
        return section.kind === "links"
          ? {
              ...section,
              items: [
                { id: newId(), label: "GitHub", url: "github.com/alexmoreau" },
                { id: newId(), label: "Portfolio", url: "alexmoreau.dev" },
              ],
            }
          : section
      default:
        return section
    }
  })
  return resume
}

/**
 * Bring any stored or imported JSON up to the current shape. Unknown fields
 * are dropped and missing ones get defaults, so old files keep opening.
 */
export function normalizeResume(raw: unknown): Resume {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const now = new Date().toISOString()
  return resumeSchema.parse({
    id: typeof input.id === "string" && input.id ? input.id : newId(),
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now,
    ...input,
    personal: personalSchema.parse(input.personal ?? {}),
    settings: settingsSchema.parse(input.settings ?? {}),
    sections: Array.isArray(input.sections)
      ? input.sections.flatMap((s) => {
          const parsed = sectionSchema.safeParse(s)
          return parsed.success ? [sanitizeSection(parsed.data)] : []
        })
      : [],
  })
}

/** Rich text is stored as HTML. Only the editor's own markup is kept. */
function sanitizeSection(section: Section): Section {
  if (section.kind === "text") return { ...section, html: sanitizeHtml(section.html) }
  if (section.kind === "timeline") {
    return { ...section, items: section.items.map((i) => ({ ...i, description: sanitizeHtml(i.description) })) }
  }
  return section
}
