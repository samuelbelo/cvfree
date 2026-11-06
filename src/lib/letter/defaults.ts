import { nanoid } from "nanoid"

import { defaultSettings } from "@/lib/resume/defaults"
import { fullName, prettyUrl } from "@/lib/resume/format"
import { sanitizeHtml } from "@/lib/resume/sanitize"
import type { Locale, Resume } from "@/lib/resume/schema"

import { letterSchema, type Letter, type LetterSender, type LetterSummary } from "./schema"

export const newLetterId = () => nanoid(10)

/** The sender block as it reads from a resume. */
export function senderFromResume(resume: Resume): LetterSender {
  const p = resume.personal
  return {
    name: fullName(resume),
    jobTitle: p.jobTitle,
    email: p.email,
    phone: p.phone,
    location: [p.city, p.country].filter(Boolean).join(", "),
    website: prettyUrl(p.website || p.linkedin),
  }
}

export function emptyLetter(opts: { resume?: Resume | null; locale?: Locale; title?: string } = {}): Letter {
  const now = new Date().toISOString()
  const resume = opts.resume ?? null
  return {
    id: newLetterId(),
    title: opts.title ?? "Untitled cover letter",
    locale: opts.locale ?? resume?.locale ?? "en",
    resumeId: resume?.id ?? null,
    createdAt: now,
    updatedAt: now,
    sender: resume ? senderFromResume(resume) : { name: "", jobTitle: "", email: "", phone: "", location: "", website: "" },
    recipient: { company: "", name: "", position: "", address: "" },
    date: "",
    greeting: "",
    body: "",
    closing: "",
    settings: resume ? { ...resume.settings, headerText: "", footerText: "", pageNumbering: "none" } : defaultSettings(),
  }
}

/** Bring stored or imported JSON up to the current shape and clean the body. */
export function normalizeLetter(raw: unknown): Letter {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const now = new Date().toISOString()
  const letter = letterSchema.parse({
    id: typeof input.id === "string" && input.id ? input.id : newLetterId(),
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now,
    ...input,
    sender: input.sender ?? {},
    recipient: input.recipient ?? {},
    settings: input.settings ?? {},
  })
  letter.body = sanitizeHtml(letter.body)
  return letter
}

export function toLetterSummary(letter: Letter): LetterSummary {
  return {
    id: letter.id,
    title: letter.title,
    locale: letter.locale,
    resumeId: letter.resumeId,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
    company: letter.recipient.company,
    position: letter.recipient.position,
    senderName: letter.sender.name,
  }
}
