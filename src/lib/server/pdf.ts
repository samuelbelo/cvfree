import "server-only"

import { existsSync } from "node:fs"

import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import puppeteer, { type Browser } from "puppeteer-core"

import { SESSION_COOKIE, sessionToken } from "@/lib/auth"
import { WORDS } from "@/lib/resume/i18n"
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

export async function renderPdf(resume: Resume): Promise<Uint8Array> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    const url = `${config.internalUrl}/print/${resume.id}`
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
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true })
    return await stampPages(pdf, resume)
  } finally {
    await page.close().catch(() => {})
  }
}

/**
 * The page has no CSS margins (so colored sidebars reach the edges), which
 * leaves no room for Chrome's header and footer. Page numbers and the
 * header/footer text are drawn onto the finished PDF instead.
 */
async function stampPages(bytes: Uint8Array, resume: Resume): Promise<Uint8Array> {
  const s = resume.settings
  if (s.pageNumbering === "none" && !s.headerText.trim() && !s.footerText.trim()) return bytes
  const doc = await PDFDocument.load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length
  const words = WORDS[resume.locale]
  const size = 7.5
  const gray = rgb(0.45, 0.47, 0.5)
  const edge = Math.max(10, (s.page.marginY * 72) / 25.4 / 2.4)

  pages.forEach((page, index) => {
    const { width, height } = page.getSize()
    const n = index + 1
    const label =
      s.pageNumbering === "numbers"
        ? `${n}`
        : s.pageNumbering === "fraction"
          ? `${n}/${total}`
          : s.pageNumbering === "page"
            ? `${words.page} ${n} ${words.of} ${total}`
            : ""
    const draw = (text: string, x: "left" | "center" | "right", y: number) => {
      const clean = text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "")
      const w = font.widthOfTextAtSize(clean, size)
      const margin = (s.page.marginX * 72) / 25.4
      const px = x === "left" ? margin : x === "right" ? width - margin - w : (width - w) / 2
      page.drawText(clean, { x: px, y, size, font, color: gray })
    }
    if (s.headerText.trim()) draw(s.headerText.trim(), "center", height - edge - size)
    if (s.footerText.trim()) draw(s.footerText.trim(), label ? "left" : "center", edge)
    if (label) draw(label, s.footerText.trim() ? "right" : "center", edge)
  })
  return await doc.save()
}
