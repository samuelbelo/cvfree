import type { ResumeSettings } from "./schema"

/*
 * "Fit to one page": the same resume with less air. tighten(settings, 0) is the
 * layout as it is, tighten(settings, 1) is the tightest one that still reads well.
 * The first half of the range only removes space (gaps, margins, line height).
 * Font sizes start to shrink in the second half, so text stays as large as it can.
 */

/** Nothing goes below these. A value already below its floor is left alone. */
const FLOOR = {
  spacing: { section: 5, title: 2, block: 3, inside: 0.5 },
  page: { marginX: 9, marginY: 8 },
  lineHeight: 1.15,
  fontSize: { name: 18, section: 9.5, heading: 8.5, body: 8 },
} as const

export const FIT_STEPS = 40

const toward = (from: number, floor: number, t: number, step: number) => {
  const target = from - (from - Math.min(from, floor)) * t
  return Math.round(target / step) * step
}

export function tighten(settings: ResumeSettings, t: number): ResumeSettings {
  const air = Math.min(1, t * 2)
  const type = Math.max(0, t * 2 - 1)
  const s = settings
  return {
    ...s,
    lineHeight: +toward(s.lineHeight, FLOOR.lineHeight, air, 0.05).toFixed(2),
    spacing: {
      section: toward(s.spacing.section, FLOOR.spacing.section, air, 0.5),
      title: toward(s.spacing.title, FLOOR.spacing.title, air, 0.5),
      block: toward(s.spacing.block, FLOOR.spacing.block, air, 0.5),
      inside: toward(s.spacing.inside, FLOOR.spacing.inside, air, 0.5),
    },
    page: {
      ...s.page,
      marginX: toward(s.page.marginX, FLOOR.page.marginX, air, 0.5),
      marginY: toward(s.page.marginY, FLOOR.page.marginY, air, 0.5),
    },
    fontSize: {
      name: toward(s.fontSize.name, FLOOR.fontSize.name, type, 0.5),
      section: toward(s.fontSize.section, FLOOR.fontSize.section, type, 0.5),
      heading: toward(s.fontSize.heading, FLOOR.fontSize.heading, type, 0.5),
      body: toward(s.fontSize.body, FLOOR.fontSize.body, type, 0.5),
    },
  }
}

/**
 * The loosest step whose layout passes fits(). Heights only go down as the
 * step goes up, so a binary search finds it in six measurements.
 * Returns null when even the tightest layout does not fit.
 */
export function loosestFit(settings: ResumeSettings, fits: (candidate: ResumeSettings) => boolean): ResumeSettings | null {
  if (!fits(tighten(settings, 1))) return null
  let lo = 0
  let hi = FIT_STEPS
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (fits(tighten(settings, mid / FIT_STEPS))) hi = mid
    else lo = mid + 1
  }
  return tighten(settings, hi / FIT_STEPS)
}

/** What changed, in words, for the confirmation message. */
export function describeFit(before: ResumeSettings, after: ResumeSettings): string {
  const parts: string[] = []
  if (after.fontSize.body !== before.fontSize.body) parts.push(`body text ${after.fontSize.body} pt`)
  if (after.lineHeight !== before.lineHeight) parts.push(`line height ${Math.round(after.lineHeight * 100)}%`)
  if (after.page.marginY !== before.page.marginY || after.page.marginX !== before.page.marginX) {
    parts.push(`margins ${after.page.marginY} and ${after.page.marginX} mm`)
  }
  const gaps = (["section", "title", "block", "inside"] as const).some((k) => after.spacing[k] !== before.spacing[k])
  if (gaps) parts.push("tighter spacing")
  return parts.join(", ")
}
