import "server-only"

import { existsSync } from "node:fs"

import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import puppeteer, { type Browser } from "puppeteer-core"

import { SESSION_COOKIE, sessionToken } from "@/lib/auth"
import { fullName } from "@/lib/resume/format"
import { WORDS } from "@/lib/resume/i18n"
import type { Letter } from "@/lib/letter/schema"
import type { Resume } from "@/lib/resume/schema"

import { config } from "./config"

const CANDIDATES = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
]

export function findChrome(): string | null {
  if (config.chromePath) return existsSync(config.chromePath) ? config.chromePath : null
  return CANDIDATES.find((p) => existsSync(p)) ?? null
}

let browserPromise: Promise<Browser> | null = null

/** One shared headless browser. It starts on the first export and is reused. */
async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null)
    if (browser?.connected) return browser
  }
  const executablePath = findChrome()
  if (!executablePath) {
    throw new Error("No Chrome or Chromium found. Set CHROME_PATH or use the Docker image.")
  }
  browserPromise = puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  })
  return browserPromise
}

/** Print one of the app's own pages to PDF, as the headless browser sees it. */
async function printPath(pathname: string): Promise<Uint8Array> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    const url = `${config.internalUrl}${pathname}`
    if (config.password) {
      await browser.setCookie({
        name: SESSION_COOKIE,
        value: await sessionToken(config.password),
        domain: new URL(config.internalUrl).hostname,
        path: "/",
      })
    }
    await page.emulateMediaType("print")
    const res = await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 })
    if (!res || !res.ok()) throw new Error(`Print page returned ${res?.status() ?? "no response"}`)
    await page.evaluate(() => document.fonts.ready)
    return await page.pdf({ printBackground: true, preferCSSPageSize: true })
  } finally {
    await page.close().catch(() => {})
  }
}

export async function renderPdf(resume: Resume): Promise<Uint8Array> {
  const pdf = await printPath(`/print/${resume.id}`)
  return await stampPages(pdf, resume)
}

export async function renderLetterPdf(letter: Letter): Promise<Uint8Array> {
  const pdf = await printPath(`/print/letter/${letter.id}`)
  const doc = await PDFDocument.load(pdf)
  const name = letter.sender.name.trim()
  const subject = letter.recipient.company ? `Cover letter, ${letter.recipient.company}` : "Cover letter"
  doc.setTitle(name ? `${name} – ${subject}` : subject)
  if (name) doc.setAuthor(name)
  doc.setSubject(letter.recipient.position || subject)
  doc.setCreator("cvfree")
  doc.setProducer("cvfree")
  doc.setLanguage(letter.locale)
  return await doc.save()
}

/**
 * Header and footer text are part of the printed page (see PrintChrome), so
 * they keep the resume's font and any script. Only the page count is known
 * after printing: it is stamped here. The label is a number or a short
 * localized word, which fits the built-in Helvetica.
 */
async function stampPages(bytes: Uint8Array, resume: Resume): Promise<Uint8Array> {
  const s = resume.settings
  const doc = await PDFDocument.load(bytes)
  const name = fullName(resume)
  doc.setTitle(name ? `${name} \u2013 ${resume.title}` : resume.title)
  if (name) doc.setAuthor(name)
  doc.setSubject(resume.personal.jobTitle)
  doc.setCreator("cvfree")
  doc.setProducer("cvfree")
  doc.setLanguage(resume.locale)

  if (s.pageNumbering !== "none") {
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const pages = doc.getPages()
    const total = pages.length
    const words = WORDS[resume.locale]
    const size = 7.5
    const gray = rgb(0.45, 0.47, 0.5)
    const edge = Math.max(10, (s.page.marginY * 72) / 25.4 / 2.4)
    const margin = (s.page.marginX * 72) / 25.4
    pages.forEach((page, index) => {
      const { width } = page.getSize()
      const n = index + 1
      const label =
        s.pageNumbering === "numbers" ? `${n}` : s.pageNumbering === "fraction" ? `${n}/${total}` : `${words.page} ${n} ${words.of} ${total}`
      const w = font.widthOfTextAtSize(label, size)
      const x = s.footerText.trim() ? width - margin - w : (width - w) / 2
      page.drawText(label, { x, y: edge + 2.5, size, font, color: gray })
    })
  }
  return await doc.save()
}
