import { z } from "zod"

/*
 * The resume document. Everything the editor touches lives here, so the JSON
 * file on disk, the export format and the editor state are the same shape.
 */

/** "pt" is European Portuguese, "pt-BR" Brazilian. They differ in section titles and a few words. */
export const LOCALES = ["en", "pt", "pt-BR", "es", "fr", "de"] as const
export type Locale = (typeof LOCALES)[number]

export const SECTION_KINDS = ["text", "timeline", "skills", "links", "references"] as const
export type SectionKind = (typeof SECTION_KINDS)[number]

const id = z.string().min(1)
const str = z.string().catch("")

export const timelineItemSchema = z.object({
  id,
  title: str,
  subtitle: str,
  city: str,
  startDate: str,
  endDate: str,
  current: z.boolean().catch(false),
  description: str,
})

export const skillItemSchema = z.object({
  id,
  name: str,
  level: z.number().int().min(0).max(5).catch(0),
  category: str,
})

export const linkItemSchema = z.object({
  id,
  label: str,
  url: str,
})

export const referenceItemSchema = z.object({
  id,
  name: str,
  company: str,
  email: str,
  phone: str,
})

const sectionBase = {
  id,
  /** Preset key, e.g. "experience", "languages", "customText". */
  type: z.string(),
  /** Empty means "use the localized default title". */
  title: str,
  hidden: z.boolean().catch(false),
  /** Column override for two-column templates. */
  column: z.enum(["auto", "main", "side"]).catch("auto"),
}

export const sectionSchema = z.discriminatedUnion("kind", [
  z.object({ ...sectionBase, kind: z.literal("text"), html: str }),
  z.object({
    ...sectionBase,
    kind: z.literal("timeline"),
    items: z.array(timelineItemSchema).catch([]),
  }),
  z.object({
    ...sectionBase,
    kind: z.literal("skills"),
    showLevel: z.boolean().catch(true),
    items: z.array(skillItemSchema).catch([]),
  }),
  z.object({
    ...sectionBase,
    kind: z.literal("links"),
    items: z.array(linkItemSchema).catch([]),
  }),
  z.object({
    ...sectionBase,
    kind: z.literal("references"),
    onRequest: z.boolean().catch(false),
    items: z.array(referenceItemSchema).catch([]),
  }),
])

export const personalSchema = z.object({
  jobTitle: str,
  firstName: str,
  lastName: str,
  email: str,
  phone: str,
  website: str,
  linkedin: str,
  address: str,
  city: str,
  postalCode: str,
  country: str,
  nationality: str,
  placeOfBirth: str,
  dateOfBirth: str,
  drivingLicense: str,
  /** Cropped photo stored inline as a data URL so exports stay self-contained. */
  photo: z.string().nullable().catch(null),
})

export const FONT_IDS = [
  "inter",
  "roboto",
  "lato",
  "open-sans",
  "source-sans-3",
  "ibm-plex-sans",
  "work-sans",
  "nunito",
  "montserrat",
  "raleway",
  "merriweather",
  "source-serif-4",
  "lora",
  "pt-serif",
  "eb-garamond",
] as const
export type FontId = (typeof FONT_IDS)[number]

export const DATE_FORMATS = ["MMM YYYY", "MMMM YYYY", "MM/YYYY", "YYYY"] as const
export const PAGE_NUMBERING = ["none", "numbers", "fraction", "page"] as const

const num = (min: number, max: number, fallback: number) =>
  z.number().min(min).max(max).catch(fallback)

export const settingsSchema = z.object({
  template: z.string().catch("lisbon"),
  color: z.string().catch("#1f4e79"),
  fonts: z
    .object({
      heading: z.enum(FONT_IDS).catch("inter"),
      body: z.enum(FONT_IDS).catch("inter"),
    })
    .catch({ heading: "inter", body: "inter" }),
  lineHeight: num(1, 2, 1.35),
  fontSize: z
    .object({
      name: num(14, 40, 24),
      heading: num(8, 16, 10.5),
      body: num(7, 14, 9.5),
      section: num(8, 20, 12),
    })
    .catch({ name: 24, heading: 10.5, body: 9.5, section: 12 }),
  fontWeight: z
    .object({
      name: num(300, 800, 700),
      heading: num(300, 800, 600),
      section: num(300, 800, 600),
    })
    .catch({ name: 700, heading: 600, section: 600 }),
  page: z
    .object({
      format: z.enum(["A4", "Letter"]).catch("A4"),
      marginX: num(5, 30, 16),
      marginY: num(5, 30, 14),
    })
    .catch({ format: "A4", marginX: 16, marginY: 14 }),
  spacing: z
    .object({
      section: num(0, 30, 12),
      title: num(0, 16, 5),
      block: num(0, 20, 7),
      inside: num(0, 10, 2),
    })
    .catch({ section: 12, title: 5, block: 7, inside: 2 }),
  dateFormat: z.enum(DATE_FORMATS).catch("MMM YYYY"),
  headerAlign: z.enum(["left", "center", "right"]).catch("left"),
  dateAlign: z.enum(["inline", "right"]).catch("right"),
  skillsLayout: z.enum(["inline", "columns", "bars"]).catch("columns"),
  /** Dots are visual only. Text ("Expert") survives copy, paste and resume parsers. */
  skillLevelStyle: z.enum(["dots", "text"]).catch("dots"),
  skillsColumns: num(1, 4, 2),
  skillsDivider: z.enum(["•", "|", ",", "/"]).catch("•"),
  educationFirst: z.enum(["institution", "degree"]).catch("degree"),
  uppercaseTitles: z.boolean().catch(false),
  contactIcons: z.boolean().catch(true),
  photo: z
    .object({
      show: z.boolean().catch(true),
      shape: z.enum(["circle", "rounded", "square"]).catch("circle"),
      size: num(15, 45, 28),
    })
    .catch({ show: true, shape: "circle", size: 28 }),
  headerText: str,
  footerText: str,
  pageNumbering: z.enum(PAGE_NUMBERING).catch("none"),
})

export const resumeSchema = z.object({
  id,
  title: z.string().catch("Untitled resume"),
  locale: z.enum(LOCALES).catch("en"),
  createdAt: z.string(),
  updatedAt: z.string(),
  personal: personalSchema,
  sections: z.array(sectionSchema).catch([]),
  settings: settingsSchema,
})

export type TimelineItem = z.infer<typeof timelineItemSchema>
export type SkillItem = z.infer<typeof skillItemSchema>
export type LinkItem = z.infer<typeof linkItemSchema>
export type ReferenceItem = z.infer<typeof referenceItemSchema>
export type Section = z.infer<typeof sectionSchema>
export type Personal = z.infer<typeof personalSchema>
export type ResumeSettings = z.infer<typeof settingsSchema>
export type Resume = z.infer<typeof resumeSchema>
export type DateFormat = (typeof DATE_FORMATS)[number]
export type PageNumbering = (typeof PAGE_NUMBERING)[number]

export type SectionOf<K extends SectionKind> = Extract<Section, { kind: K }>

/** Light summary used by the dashboard list. */
export type ResumeSummary = Pick<Resume, "id" | "title" | "locale" | "createdAt" | "updatedAt"> & {
  template: string
  fullName: string
  jobTitle: string
}
