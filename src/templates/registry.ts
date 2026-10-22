import type { ComponentType } from "react"

import type { ResumeSettings } from "@/lib/resume/schema"

import type { Ctx } from "./blocks"
import { Bold, Ledger, Lisbon, Meridian, Oxford, Plain, Swift, TimelineDesign, Vector } from "./designs/single"

export type TemplateTag = "ats" | "photo" | "two-column" | "docx" | "creative"

export type TemplateMeta = {
  id: string
  name: string
  description: string
  tags: TemplateTag[]
  supportsPhoto: boolean
  /** Applied when the user switches to this template. Color is kept. */
  defaults: Partial<Pick<ResumeSettings, "fonts" | "fontSize" | "fontWeight" | "uppercaseTitles" | "dateAlign" | "skillsLayout" | "headerAlign">>
  component: ComponentType<{ ctx: Ctx }>
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "lisbon",
    name: "Lisbon",
    description: "Classic single column with colored rules. Safe for any application.",
    tags: ["ats", "docx", "photo"],
    supportsPhoto: true,
    defaults: { fonts: { heading: "inter", body: "inter" }, uppercaseTitles: false, dateAlign: "right", skillsLayout: "columns", headerAlign: "left" },
    component: Lisbon,
  },
  {
    id: "oxford",
    name: "Oxford",
    description: "Traditional serif layout, centered header and framed titles.",
    tags: ["ats", "docx"],
    supportsPhoto: false,
    defaults: { fonts: { heading: "eb-garamond", body: "eb-garamond" }, uppercaseTitles: true, dateAlign: "right", skillsLayout: "inline", headerAlign: "center" },
    component: Oxford,
  },
  {
    id: "plain",
    name: "Plain",
    description: "No decoration at all. Built for applicant tracking systems.",
    tags: ["ats", "docx"],
    supportsPhoto: false,
    defaults: { fonts: { heading: "source-sans-3", body: "source-sans-3" }, uppercaseTitles: false, dateAlign: "inline", skillsLayout: "inline", headerAlign: "left" },
    component: Plain,
  },
  {
    id: "meridian",
    name: "Meridian",
    description: "Colored name, photo on the right, accent bars on section titles.",
    tags: ["ats", "docx", "photo"],
    supportsPhoto: true,
    defaults: { fonts: { heading: "lato", body: "lato" }, uppercaseTitles: false, dateAlign: "right", skillsLayout: "columns", headerAlign: "left" },
    component: Meridian,
  },
  {
    id: "ledger",
    name: "Ledger",
    description: "Section titles in a label column, content on the right.",
    tags: ["ats", "docx"],
    supportsPhoto: false,
    defaults: { fonts: { heading: "ibm-plex-sans", body: "ibm-plex-sans" }, uppercaseTitles: true, dateAlign: "right", skillsLayout: "columns", headerAlign: "left" },
    component: Ledger,
  },
  {
    id: "swift",
    name: "Swift",
    description: "Bold colored name and a compact contact grid.",
    tags: ["ats", "docx", "photo"],
    supportsPhoto: true,
    defaults: { fonts: { heading: "montserrat", body: "open-sans" }, uppercaseTitles: true, dateAlign: "right", skillsLayout: "columns", headerAlign: "left" },
    component: Swift,
  },
  {
    id: "vector",
    name: "Vector",
    description: "Uppercase colored titles and highlighted skill chips.",
    tags: ["ats", "docx", "photo"],
    supportsPhoto: true,
    defaults: { fonts: { heading: "work-sans", body: "work-sans" }, uppercaseTitles: true, dateAlign: "right", skillsLayout: "inline", headerAlign: "left" },
    component: Vector,
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Dates in a left gutter joined by a vertical line.",
    tags: ["photo", "creative"],
    supportsPhoto: true,
    defaults: { fonts: { heading: "raleway", body: "lato" }, uppercaseTitles: true, dateAlign: "right", skillsLayout: "columns", headerAlign: "left" },
    component: TimelineDesign,
  },
  {
    id: "bold",
    name: "Bold",
    description: "Heavy name block and filled section tags. Hard to miss.",
    tags: ["photo", "creative"],
    supportsPhoto: true,
    defaults: { fonts: { heading: "montserrat", body: "nunito" }, uppercaseTitles: true, dateAlign: "right", skillsLayout: "columns", headerAlign: "left" },
    component: Bold,
  },
]

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

export function getTemplate(id: string): TemplateMeta {
  return BY_ID.get(id) ?? TEMPLATES[0]
}

export const TEMPLATE_FILTERS: { id: "all" | TemplateTag; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photo", label: "With photo" },
  { id: "two-column", label: "Two column" },
  { id: "ats", label: "ATS" },
  { id: "docx", label: "DOCX" },
  { id: "creative", label: "Creative" },
]

export const COLOR_SWATCHES = ["#111827", "#1f4e79", "#2563eb", "#0f766e", "#6d28d9", "#be123c", "#c2410c", "#a16207"]
