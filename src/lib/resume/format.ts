import { getPreset } from "./presets"
import { WORDS } from "./i18n"
import type { DateFormat, Locale, Resume, Section } from "./schema"

export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  pt: "pt-PT",
  "pt-BR": "pt-BR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
}

/** Dates are stored as "YYYY-MM" or "YYYY". Anything else is shown as typed. */
export function formatDate(value: string, format: DateFormat, locale: Locale): string {
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(value.trim())
  if (!match) return value.trim()
  const year = match[1]
  const month = match[2] ? Number(match[2]) : null
  if (!month || format === "YYYY") return year
  if (format === "MM/YYYY") return `${String(month).padStart(2, "0")}/${year}`
  const date = new Date(Date.UTC(Number(year), month - 1, 1))
  const monthName = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: format === "MMMM YYYY" ? "long" : "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "")
  const cased = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  return `${cased} ${year}`
}

export function formatRange(
  start: string,
  end: string,
  current: boolean,
  format: DateFormat,
  locale: Locale
): string {
  const from = start ? formatDate(start, format, locale) : ""
  const to = current ? WORDS[locale].present : end ? formatDate(end, format, locale) : ""
  if (from && to) return `${from} – ${to}`
  return from || to
}

export function sectionTitle(section: Section, locale: Locale): string {
  return section.title.trim() || getPreset(section.type).titles[locale]
}

export function fullName(resume: Pick<Resume, "personal">): string {
  return [resume.personal.firstName, resume.personal.lastName].filter(Boolean).join(" ").trim()
}

/** Strip tags for plain text exports and keyword analysis. */
export function htmlToText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h\d|li|ul|ol)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function isHtmlEmpty(html: string): boolean {
  return htmlToText(html).length === 0
}

export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
}

export function hrefFor(url: string): string {
  if (!url) return url
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  return `https://${url}`
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

/** Digits with the usual separators, at least 6 of them. */
export const isPhone = (value: string) => /^\+?[\d\s().-]{6,}$/.test(value.trim()) && (value.match(/\d/g) ?? []).length >= 6

/** Something with a dot and no spaces, or an explicit http(s) scheme. */
export const isUrl = (value: string) => {
  const v = value.trim()
  if (/^https?:\/\/\S+$/i.test(v)) return true
  return /^[^\s/:]+\.[a-z0-9-]{2,}(\/\S*)?$/i.test(v) && !/^[a-z][a-z0-9+.-]*:/i.test(v)
}
