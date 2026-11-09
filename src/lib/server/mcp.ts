import "server-only"

import { McpServer, WebStandardStreamableHTTPServerTransport, type CallToolResult } from "@modelcontextprotocol/server"
import { z } from "zod"

import { emptyLetter, toLetterSummary } from "@/lib/letter/defaults"
import { letterToText } from "@/lib/letter/format"
import type { Letter } from "@/lib/letter/schema"
import { completeness, matchKeywords, reviewResume } from "@/lib/resume/analysis"
import { createSection, createSkillItem, createTimelineItem, emptyResume, newId, sampleResume } from "@/lib/resume/defaults"
import { fullName } from "@/lib/resume/format"
import { SECTION_PRESETS } from "@/lib/resume/presets"
import { FONT_IDS, LOCALES, settingsSchema, type Resume, type Section } from "@/lib/resume/schema"
import { toJsonResume } from "@/lib/resume/json-resume"
import { resumeToText } from "@/lib/resume/text-export"
import { textToHtml } from "@/lib/resume/text-to-html"
import { TEMPLATES } from "@/templates/registry"

import { getAppSettings } from "./app-settings"
import { config } from "./config"
import { renderDocx, renderLetterDocx } from "./docx"
import { readJobPosting } from "./job-text"
import { deleteLetter, getLetter, listLetters, saveLetter } from "./letters"
import { renderLetterPdf, renderPdf } from "./pdf"
import {
  deleteResume,
  getResume,
  listResumes,
  listSnapshots,
  restoreSnapshot,
  saveResume,
  toSummary,
} from "./repo"

/*
 * The MCP server. One tool per thing a person can do in the editor, so an
 * assistant connected to this instance can read, review, edit and export the
 * same resumes. Every write goes through the same schema and sanitizer as the
 * editor, so nothing the UI would refuse gets stored. Stateless: a fresh
 * server and transport per HTTP request, which is the idiom for serverless
 * style route handlers.
 */

const INSTRUCTIONS = [
  "cvfree is a self-hosted resume builder. Resumes and cover letters are documents owned by the person running this instance.",
  "Start with list_resumes to get ids. Refer to sections by their type (summary, experience, education, skills, languages, links, projects...) or by id.",
  "Text fields accept plain text: blank lines separate paragraphs, lines starting with '- ' become bullets. Dates are YYYY-MM or YYYY.",
  "Never invent facts about the person. Add only what they told you or what is already in the resume.",
].join(" ")

const ok = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
})
const fail = (message: string): CallToolResult => ({ isError: true, content: [{ type: "text", text: message }] })

const READ = { readOnlyHint: true }
const WRITE = { readOnlyHint: false, destructiveHint: false }
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true }

const id = z.string().min(1).describe("Resume id, from list_resumes")
const letterId = z.string().min(1).describe("Cover letter id, from list_letters")
const sectionRef = z.string().min(1).describe("Section type (experience, education, skills...), section id, or its title")
const dateStr = z
  .string()
  .regex(/^(\d{4}(-\d{2})?)?$/, "Use YYYY-MM or YYYY, or an empty string")
  .describe("YYYY-MM or YYYY")
const locale = z.enum(LOCALES).describe("Language of section titles and dates")
const exportFormat = z.enum(["pdf", "docx", "txt", "json"])
const richText = {
  text: z.string().optional().describe("Plain text. Blank lines separate paragraphs, '- ' starts a bullet."),
  html: z.string().optional().describe("HTML with p, ul, ol, li, strong, em, u, a. Use instead of text when you need marks."),
}

const SECTION_TYPES = SECTION_PRESETS.map((p) => p.type)

function sectionOf(resume: Resume, ref: string): Section | undefined {
  const lower = ref.trim().toLowerCase()
  return (
    resume.sections.find((s) => s.id === ref) ??
    resume.sections.find((s) => s.type === ref) ??
    resume.sections.find((s) => s.title.trim().toLowerCase() === lower && lower)
  )
}

/** Find the section, or create it when the reference is a known type that the resume lacks. */
function sectionOrCreate(resume: Resume, ref: string): Section {
  const found = sectionOf(resume, ref)
  if (found) return found
  if (!SECTION_TYPES.includes(ref)) throw new Error(`No section "${ref}". Section types: ${SECTION_TYPES.join(", ")}`)
  const section = createSection(ref)
  resume.sections.push(section)
  return section
}

function htmlFrom(input: { text?: string; html?: string }): string | undefined {
  if (typeof input.html === "string") return input.html
  if (typeof input.text === "string") return textToHtml(input.text)
  return undefined
}

async function withResume(resumeId: string, fn: (resume: Resume) => Promise<CallToolResult> | CallToolResult) {
  const resume = await getResume(resumeId)
  if (!resume) return fail(`No resume with id "${resumeId}". Call list_resumes first.`)
  try {
    return await fn(resume)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "The call failed")
  }
}

async function withLetter(letterRef: string, fn: (letter: Letter) => Promise<CallToolResult> | CallToolResult) {
  const letter = await getLetter(letterRef)
  if (!letter) return fail(`No cover letter with id "${letterRef}". Call list_letters first.`)
  try {
    return await fn(letter)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "The call failed")
  }
}

/** What a write returns: enough to continue, not the whole document. */
async function saved(resume: Resume, extra: Record<string, unknown> = {}) {
  const next = await saveResume(resume)
  return ok({ id: next.id, updatedAt: next.updatedAt, completeness: completeness(next).score, ...extra })
}

const blob = (uri: string, mimeType: string, bytes: Uint8Array, note: string): CallToolResult => ({
  content: [
    { type: "text", text: note },
    { type: "resource", resource: { uri, mimeType, blob: Buffer.from(bytes).toString("base64") } },
  ],
})

const personalInput = z
  .object({
    jobTitle: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    linkedin: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    nationality: z.string().optional(),
    placeOfBirth: z.string().optional(),
    dateOfBirth: z.string().optional(),
    drivingLicense: z.string().optional(),
  })
  .describe("Only the fields given are changed")

const settingsInput = z
  .object({
    template: z.enum(TEMPLATES.map((t) => t.id) as [string, ...string[]]).optional(),
    color: z.string().optional().describe("Hex color such as #1f4e79"),
    fonts: z.object({ heading: z.enum(FONT_IDS).optional(), body: z.enum(FONT_IDS).optional() }).optional(),
    lineHeight: z.number().min(1).max(2).optional(),
    fontSize: z
      .object({
        name: z.number().optional(),
        heading: z.number().optional(),
        body: z.number().optional(),
        section: z.number().optional(),
      })
      .optional(),
    page: z.object({ format: z.enum(["A4", "Letter"]).optional(), marginX: z.number().optional(), marginY: z.number().optional() }).optional(),
    dateFormat: z.enum(["MMM YYYY", "MMMM YYYY", "MM/YYYY", "YYYY"]).optional(),
    headerAlign: z.enum(["left", "center", "right"]).optional(),
    skillsLayout: z.enum(["inline", "columns", "bars"]).optional(),
    skillLevelStyle: z.enum(["dots", "text"]).optional(),
    uppercaseTitles: z.boolean().optional(),
    contactIcons: z.boolean().optional(),
    photo: z.object({ show: z.boolean().optional(), shape: z.enum(["circle", "rounded", "square"]).optional(), size: z.number().optional() }).optional(),
    headerText: z.string().optional(),
    footerText: z.string().optional(),
    pageNumbering: z.enum(["none", "numbers", "fraction", "page"]).optional(),
  })
  .describe("Only the fields given are changed. Nested objects are merged.")

type Patch = Record<string, unknown>

/** Merge one level deep, then run the result through the schema so out-of-range values fall back. */
function mergeSettings(current: Resume["settings"], patch: Patch) {
  const next: Patch = { ...current }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    const cur = next[key]
    next[key] = cur && typeof cur === "object" && value && typeof value === "object" ? { ...cur, ...value } : value
  }
  const parsed = settingsSchema.parse(next)
  const ignored = Object.keys(patch).filter((k) => JSON.stringify(next[k]) !== JSON.stringify((parsed as Patch)[k]))
  return { settings: parsed, ignored }
}

export function buildServer(): McpServer {
  const server = new McpServer({ name: "cvfree", version: config.version }, { instructions: INSTRUCTIONS })

  /* ---------------------------------------------------------------- */
  /* Reading                                                           */
  /* ---------------------------------------------------------------- */

  server.registerTool(
    "list_resumes",
    { description: "All resumes on this instance, newest first, with id, title, name, job title, template and dates.", annotations: READ },
    async () => ok(await listResumes())
  )

  server.registerTool(
    "get_resume",
    {
      description: "One resume. As JSON (full document with section and item ids, needed for edits) or as plain text (quick read).",
      inputSchema: z.object({ id, as: z.enum(["json", "text"]).default("json") }),
      annotations: READ,
    },
    async ({ id: resumeId, as }) => withResume(resumeId, (r) => ok(as === "text" ? resumeToText(r) : r))
  )

  server.registerTool(
    "review_resume",
    {
      description: "Completeness score (0 to 100) with what is missing, plus writing issues: weak phrases, jobs without dates or numbers, summary length.",
      inputSchema: z.object({ id }),
      annotations: READ,
    },
    async ({ id: resumeId }) => withResume(resumeId, (r) => ok({ ...completeness(r), issues: reviewResume(r).map(({ id, severity, area, message }) => ({ id, severity, area, message })) }))
  )

  server.registerTool(
    "match_keywords",
    {
      description:
        "Compare a resume with a job posting: coverage score, keywords already present and keywords missing. Give the posting text or a public URL.",
      inputSchema: z.object({
        id,
        job_description: z.string().optional().describe("The posting text"),
        job_url: z.string().optional().describe("Public URL of the posting. Private and local addresses are refused."),
      }),
      annotations: { ...READ, openWorldHint: true },
    },
    async ({ id: resumeId, job_description, job_url }) =>
      withResume(resumeId, async (r) => {
        let text = job_description ?? ""
        let title = ""
        if (!text.trim() && job_url) ({ text, title } = await readJobPosting(job_url))
        if (!text.trim()) return fail("Give job_description or job_url.")
        return ok({ posting: title || undefined, ...matchKeywords(r, text) })
      })
  )

  server.registerTool(
    "list_templates",
    { description: "The templates a resume can use, with their tags (ats, photo, two-column, docx, creative).", annotations: READ },
    async () => ok(TEMPLATES.map((t) => ({ id: t.id, name: t.name, tags: t.tags, description: t.description })))
  )

  server.registerTool(
    "list_section_types",
    { description: "Section types that add_section and the item tools accept, with the kind of content each holds.", annotations: READ },
    async () =>
      ok(
        SECTION_PRESETS.map((p) => ({
          type: p.type,
          kind: p.kind,
          title: p.titles.en,
          description: p.description,
          fields: p.fields,
        }))
      )
  )

  server.registerTool(
    "list_history",
    { description: "Saved versions of a resume, newest first. A copy is kept before each save, at most one every ten minutes.", inputSchema: z.object({ id }), annotations: READ },
    async ({ id: resumeId }) => withResume(resumeId, async () => ok(await listSnapshots(resumeId)))
  )

  /* ---------------------------------------------------------------- */
  /* Resume writes                                                     */
  /* ---------------------------------------------------------------- */

  server.registerTool(
    "create_resume",
    {
      description: "Create a resume: blank (summary, experience, education, skills, languages, links) or the fictional sample.",
      inputSchema: z.object({
        mode: z.enum(["blank", "sample"]).default("blank"),
        title: z.string().max(120).optional(),
        locale: locale.optional(),
      }),
      annotations: WRITE,
    },
    async ({ mode, title, locale: loc }) => {
      const prefs = await getAppSettings()
      const template = TEMPLATES.find((t) => t.id === prefs.defaultTemplate) ?? TEMPLATES[0]
      const opts = { locale: loc ?? prefs.defaultLocale, settings: { ...template.defaults, template: template.id, color: prefs.defaultColor } }
      const resume = mode === "sample" ? sampleResume(opts) : emptyResume(opts)
      if (title) resume.title = title
      return ok(toSummary(await saveResume(resume)))
    }
  )

  server.registerTool(
    "rename_resume",
    { description: "Change the resume's title (the name shown on the dashboard, not the person's name).", inputSchema: z.object({ id, title: z.string().min(1).max(120) }), annotations: WRITE },
    async ({ id: resumeId, title }) =>
      withResume(resumeId, (r) => {
        r.title = title
        return saved(r, { title })
      })
  )

  server.registerTool(
    "duplicate_resume",
    { description: "Copy a resume into a new one, for a tailored version. The copy has no public link.", inputSchema: z.object({ id, title: z.string().max(120).optional() }), annotations: WRITE },
    async ({ id: resumeId, title }) =>
      withResume(resumeId, async (r) => {
        const now = new Date().toISOString()
        const copy = await saveResume({ ...structuredClone(r), id: newId(), title: title || `${r.title} (copy)`, createdAt: now, updatedAt: now, shareToken: null })
        return ok(toSummary(copy))
      })
  )

  server.registerTool(
    "delete_resume",
    { description: "Delete a resume for good. Its version history stays on disk but is no longer reachable.", inputSchema: z.object({ id }), annotations: DESTRUCTIVE },
    async ({ id: resumeId }) => withResume(resumeId, async () => ok({ deleted: await deleteResume(resumeId) }))
  )

  server.registerTool(
    "update_personal",
    { description: "Set name, job title, contact details and the other header fields.", inputSchema: z.object({ id, personal: personalInput }), annotations: WRITE },
    async ({ id: resumeId, personal }) =>
      withResume(resumeId, (r) => {
        for (const [k, v] of Object.entries(personal)) if (typeof v === "string") (r.personal as Patch)[k] = v
        return saved(r, { name: fullName(r) })
      })
  )

  server.registerTool(
    "update_settings",
    { description: "Change template, color, fonts, sizes, page format, date format, skills layout, header and footer text.", inputSchema: z.object({ id, settings: settingsInput }), annotations: WRITE },
    async ({ id: resumeId, settings }) =>
      withResume(resumeId, (r) => {
        const { settings: next, ignored } = mergeSettings(r.settings, settings)
        r.settings = next
        return saved(r, ignored.length ? { ignored, note: "These values were out of range and kept their previous or default value." } : {})
      })
  )

  server.registerTool(
    "set_section_text",
    {
      description: "Replace the content of a text section (summary, accomplishments, a custom text section). Creates the section when missing.",
      inputSchema: z.object({ id, section: sectionRef, ...richText, title: z.string().max(80).optional().describe("Custom heading. Empty keeps the localized default.") }),
      annotations: WRITE,
    },
    async ({ id: resumeId, section: ref, text, html, title }) =>
      withResume(resumeId, (r) => {
        const section = sectionOrCreate(r, ref)
        if (section.kind !== "text") return fail(`"${ref}" is a ${section.kind} section. Use the item tools for it.`)
        const next = htmlFrom({ text, html })
        if (next !== undefined) section.html = next
        if (title !== undefined) section.title = title
        return saved(r, { section: section.id })
      })
  )

  server.registerTool(
    "add_section",
    {
      description: "Add a section by type. Custom types: customText, customTimeline, customSkills, with your own title.",
      inputSchema: z.object({ id, type: z.enum(SECTION_TYPES as [string, ...string[]]), title: z.string().max(80).optional() }),
      annotations: WRITE,
    },
    async ({ id: resumeId, type, title }) =>
      withResume(resumeId, (r) => {
        const preset = SECTION_PRESETS.find((p) => p.type === type)!
        if (preset.single && r.sections.some((s) => s.type === type)) return fail(`The resume already has a ${type} section.`)
        const section = createSection(type)
        if (title) section.title = title
        r.sections.push(section)
        return saved(r, { section: section.id, kind: section.kind })
      })
  )

  server.registerTool(
    "remove_section",
    { description: "Remove a whole section and everything in it.", inputSchema: z.object({ id, section: sectionRef }), annotations: DESTRUCTIVE },
    async ({ id: resumeId, section: ref }) =>
      withResume(resumeId, (r) => {
        const section = sectionOf(r, ref)
        if (!section) return fail(`No section "${ref}".`)
        r.sections = r.sections.filter((s) => s.id !== section.id)
        return saved(r, { removed: section.id })
      })
  )

  const timelineFields = {
    title: z.string().optional().describe("Job title, degree, project or certificate name"),
    subtitle: z.string().optional().describe("Company, school or issuer"),
    city: z.string().optional(),
    start_date: dateStr.optional(),
    end_date: dateStr.optional().describe("Empty with current=true for an ongoing position"),
    current: z.boolean().optional(),
    description: z.string().optional().describe("Plain text. Use '- ' bullets for achievements."),
    description_html: z.string().optional(),
  }

  server.registerTool(
    "add_timeline_item",
    {
      description: "Add a job, degree, project, certificate, course or similar entry to a timeline section. Creates the section when missing.",
      inputSchema: z.object({ id, section: sectionRef.describe("experience, education, projects, certifications, courses, internships, volunteering..."), ...timelineFields }),
      annotations: WRITE,
    },
    async ({ id: resumeId, section: ref, start_date, end_date, description, description_html, ...rest }) =>
      withResume(resumeId, (r) => {
        const section = sectionOrCreate(r, ref)
        if (section.kind !== "timeline") return fail(`"${ref}" is a ${section.kind} section, not a timeline.`)
        const item = createTimelineItem({
          ...rest,
          startDate: start_date ?? "",
          endDate: end_date ?? "",
          description: htmlFrom({ text: description, html: description_html }) ?? "",
        })
        section.items.push(item)
        return saved(r, { section: section.id, item: item.id })
      })
  )

  server.registerTool(
    "update_timeline_item",
    { description: "Change fields of an existing timeline entry. Only the fields given change.", inputSchema: z.object({ id, item_id: z.string().min(1), ...timelineFields }), annotations: WRITE },
    async ({ id: resumeId, item_id, start_date, end_date, description, description_html, ...rest }) =>
      withResume(resumeId, (r) => {
        for (const section of r.sections) {
          if (section.kind !== "timeline") continue
          const item = section.items.find((i) => i.id === item_id)
          if (!item) continue
          for (const [k, v] of Object.entries(rest)) if (v !== undefined) (item as Patch)[k] = v
          if (start_date !== undefined) item.startDate = start_date
          if (end_date !== undefined) item.endDate = end_date
          const html = htmlFrom({ text: description, html: description_html })
          if (html !== undefined) item.description = html
          return saved(r, { section: section.id, item: item.id })
        }
        return fail(`No entry with id "${item_id}". Ids come from get_resume.`)
      })
  )

  server.registerTool(
    "add_skills",
    {
      description: "Add skills (or languages, with section=languages). Level 1 to 5, 0 to hide it. Skills already present are updated instead of duplicated.",
      inputSchema: z.object({
        id,
        section: sectionRef.default("skills"),
        skills: z
          .array(z.object({ name: z.string().min(1), level: z.number().int().min(0).max(5).optional(), category: z.string().optional() }))
          .min(1),
      }),
      annotations: WRITE,
    },
    async ({ id: resumeId, section: ref, skills }) =>
      withResume(resumeId, (r) => {
        const section = sectionOrCreate(r, ref)
        if (section.kind !== "skills") return fail(`"${ref}" is a ${section.kind} section, not skills.`)
        let added = 0
        for (const s of skills) {
          const existing = section.items.find((i) => i.name.trim().toLowerCase() === s.name.trim().toLowerCase())
          if (existing) {
            if (s.level !== undefined) existing.level = s.level
            if (s.category !== undefined) existing.category = s.category
          } else {
            section.items.push(createSkillItem({ name: s.name.trim(), level: s.level ?? 3, category: s.category ?? "" }))
            added++
          }
        }
        return saved(r, { section: section.id, added, updated: skills.length - added })
      })
  )

  server.registerTool(
    "remove_item",
    { description: "Remove one entry (job, degree, skill, link, reference) by its id.", inputSchema: z.object({ id, item_id: z.string().min(1) }), annotations: DESTRUCTIVE },
    async ({ id: resumeId, item_id }) =>
      withResume(resumeId, (r) => {
        for (const section of r.sections) {
          if (section.kind === "text") continue
          const items = section.items as { id: string }[]
          const index = items.findIndex((i) => i.id === item_id)
          if (index === -1) continue
          items.splice(index, 1)
          return saved(r, { section: section.id, removed: item_id })
        }
        return fail(`No entry with id "${item_id}".`)
      })
  )

  server.registerTool(
    "add_link",
    { description: "Add a link (portfolio, GitHub, publication) to the links section.", inputSchema: z.object({ id, label: z.string().min(1), url: z.string().min(1) }), annotations: WRITE },
    async ({ id: resumeId, label, url }) =>
      withResume(resumeId, (r) => {
        const section = sectionOrCreate(r, "links")
        if (section.kind !== "links") return fail("The links section has an unexpected kind.")
        const item = { id: newId(), label, url }
        section.items.push(item)
        return saved(r, { section: section.id, item: item.id })
      })
  )

  server.registerTool(
    "export_resume",
    {
      description:
        "Export as PDF, Word, plain text, the JSON backup or JSON Resume (jsonresume.org, content only, for other tools). PDF and DOCX come back as a base64 file.",
      inputSchema: z.object({ id, format: z.enum([...exportFormat.options, "jsonresume"]).default("pdf") }),
      annotations: READ,
    },
    async ({ id: resumeId, format }) =>
      withResume(resumeId, async (r) => {
        const name = `${fullName(r) || r.title}.${format}`
        switch (format) {
          case "pdf":
            return blob(`cvfree://resumes/${r.id}/${name}`, "application/pdf", await renderPdf(r), `PDF of "${r.title}" (${name})`)
          case "docx":
            return blob(
              `cvfree://resumes/${r.id}/${name}`,
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              new Uint8Array(await renderDocx(r)),
              `Word file of "${r.title}" (${name})`
            )
          case "txt":
            return ok(resumeToText(r))
          case "jsonresume":
            return ok(toJsonResume(r))
          default:
            return ok({ cvfree: 1, resume: r })
        }
      })
  )

  server.registerTool(
    "restore_version",
    { description: "Put a saved version back as the current resume. The version it replaces is kept in the history too.", inputSchema: z.object({ id, at: z.string().describe("The 'at' value from list_history") }), annotations: WRITE },
    async ({ id: resumeId, at }) =>
      withResume(resumeId, async () => {
        const restored = await restoreSnapshot(resumeId, at)
        return restored ? ok({ id: restored.id, updatedAt: restored.updatedAt, restoredFrom: at }) : fail(`No version at ${at}.`)
      })
  )

  /* ---------------------------------------------------------------- */
  /* Cover letters                                                     */
  /* ---------------------------------------------------------------- */

  const letterFields = {
    title: z.string().max(120).optional(),
    company: z.string().optional(),
    position: z.string().optional(),
    recipient_name: z.string().optional().describe("Hiring manager, when known"),
    address: z.string().optional(),
    date: z.string().optional().describe("Free text. Empty means today in the letter's language."),
    greeting: z.string().optional().describe("Empty means a greeting built from the recipient and the language."),
    closing: z.string().optional().describe("Empty means the language's usual sign-off."),
    body: z.string().optional().describe("Plain text paragraphs separated by blank lines"),
    body_html: z.string().optional(),
  }

  function applyLetter(letter: Letter, f: z.infer<z.ZodObject<typeof letterFields>>) {
    if (f.title !== undefined) letter.title = f.title
    if (f.company !== undefined) letter.recipient.company = f.company
    if (f.position !== undefined) letter.recipient.position = f.position
    if (f.recipient_name !== undefined) letter.recipient.name = f.recipient_name
    if (f.address !== undefined) letter.recipient.address = f.address
    if (f.date !== undefined) letter.date = f.date
    if (f.greeting !== undefined) letter.greeting = f.greeting
    if (f.closing !== undefined) letter.closing = f.closing
    const html = htmlFrom({ text: f.body, html: f.body_html })
    if (html !== undefined) letter.body = html
  }

  server.registerTool(
    "list_letters",
    { description: "All cover letters, newest first, with company, position and the resume each came from.", annotations: READ },
    async () => ok(await listLetters())
  )

  server.registerTool(
    "get_letter",
    { description: "One cover letter, as JSON or plain text.", inputSchema: z.object({ id: letterId, as: z.enum(["json", "text"]).default("json") }), annotations: READ },
    async ({ id: ref, as }) => withLetter(ref, (l) => ok(as === "text" ? letterToText(l) : l))
  )

  server.registerTool(
    "create_letter",
    {
      description: "Create a cover letter. With resume_id, the sender block, language, fonts and color come from that resume.",
      inputSchema: z.object({ resume_id: z.string().optional(), locale: locale.optional(), ...letterFields }),
      annotations: WRITE,
    },
    async ({ resume_id, locale: loc, ...fields }) => {
      const resume = resume_id ? await getResume(resume_id) : null
      if (resume_id && !resume) return fail(`No resume with id "${resume_id}".`)
      const prefs = await getAppSettings()
      const letter = emptyLetter({ resume, locale: loc ?? resume?.locale ?? prefs.defaultLocale, title: fields.title })
      if (!resume) letter.settings = { ...letter.settings, color: prefs.defaultColor }
      applyLetter(letter, fields)
      if (!fields.title && fields.company) letter.title = `Cover letter for ${fields.company}`
      return ok(toLetterSummary(await saveLetter(letter)))
    }
  )

  server.registerTool(
    "update_letter",
    { description: "Change fields of a cover letter. Only the fields given change.", inputSchema: z.object({ id: letterId, ...letterFields }), annotations: WRITE },
    async ({ id: ref, ...fields }) =>
      withLetter(ref, async (l) => {
        applyLetter(l, fields)
        const next = await saveLetter(l)
        return ok({ id: next.id, updatedAt: next.updatedAt })
      })
  )

  server.registerTool(
    "delete_letter",
    { description: "Delete a cover letter for good.", inputSchema: z.object({ id: letterId }), annotations: DESTRUCTIVE },
    async ({ id: ref }) => withLetter(ref, async () => ok({ deleted: await deleteLetter(ref) }))
  )

  server.registerTool(
    "export_letter",
    { description: "Export a cover letter as PDF, Word, plain text or JSON.", inputSchema: z.object({ id: letterId, format: exportFormat.default("pdf") }), annotations: READ },
    async ({ id: ref, format }) =>
      withLetter(ref, async (l) => {
        const name = `${l.sender.name || "cover letter"} ${l.recipient.company}`.trim()
        switch (format) {
          case "pdf":
            return blob(`cvfree://letters/${l.id}/${name}.pdf`, "application/pdf", await renderLetterPdf(l), `PDF of "${l.title}"`)
          case "docx":
            return blob(
              `cvfree://letters/${l.id}/${name}.docx`,
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              new Uint8Array(await renderLetterDocx(l)),
              `Word file of "${l.title}"`
            )
          case "txt":
            return ok(letterToText(l))
          default:
            return ok({ cvfree: 1, letter: l })
        }
      })
  )

  return server
}

/** One request, one server. Nothing is kept between calls. */
export async function handleMcpRequest(request: Request): Promise<Response> {
  const server = buildServer()
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  return transport.handleRequest(request)
}
