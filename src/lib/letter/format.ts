import { htmlToText, INTL_LOCALE } from "@/lib/resume/format"
import { WORDS } from "@/lib/resume/i18n"
import type { Letter } from "./schema"

/** Today's date, written out in the letter's language. */
export function letterDate(letter: Letter): string {
  if (letter.date.trim()) return letter.date.trim()
  return new Intl.DateTimeFormat(INTL_LOCALE[letter.locale], { dateStyle: "long", timeZone: "UTC" }).format(new Date())
}

/** "Dear Jane Doe," or the language's form of "Dear Hiring Manager,". */
export function letterGreeting(letter: Letter): string {
  if (letter.greeting.trim()) return letter.greeting.trim()
  const w = WORDS[letter.locale]
  const name = letter.recipient.name.trim()
  if (!name) return `${w.hiringManager},`
  return `${w.dear} ${name},`
}

export function letterClosing(letter: Letter): string {
  return letter.closing.trim() || `${WORDS[letter.locale].sincerely},`
}

/** Plain text version, for pasting into an application form. */
export function letterToText(letter: Letter): string {
  const s = letter.sender
  const r = letter.recipient
  const w = WORDS[letter.locale]
  const lines: string[] = []
  if (s.name) lines.push(s.name)
  if (s.jobTitle) lines.push(s.jobTitle)
  const contact = [s.email, s.phone, s.location, s.website].filter(Boolean).join(" | ")
  if (contact) lines.push(contact)
  lines.push("", letterDate(letter), "")
  for (const line of [r.company, r.name, r.address]) if (line.trim()) lines.push(line.trim())
  if (r.position.trim()) lines.push("", `${w.regarding} ${r.position.trim()}`)
  lines.push("", letterGreeting(letter), "")
  lines.push(htmlToText(letter.body))
  lines.push("", letterClosing(letter), "", s.name)
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n"
}
