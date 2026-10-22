import type { CSSProperties } from "react"

import type { ResumeSettings } from "@/lib/resume/schema"

import { FONTS } from "./font-list"

export const PAGE_SIZE = {
  A4: { widthMm: 210, heightMm: 297 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
} as const

export const MM_TO_PX = 96 / 25.4

const PHOTO_RADIUS = { circle: "50%", rounded: "12%", square: "0" } as const

/** Settings become CSS custom properties, and templates only read those. */
export function cssVars(s: ResumeSettings): CSSProperties {
  const page = PAGE_SIZE[s.page.format]
  return {
    "--cv-color": s.color,
    "--cv-color-soft": `color-mix(in srgb, ${s.color} 10%, white)`,
    "--cv-color-mid": `color-mix(in srgb, ${s.color} 35%, white)`,
    "--cv-color-dark": `color-mix(in srgb, ${s.color} 75%, black)`,
    "--cv-font-heading": FONTS[s.fonts.heading].family,
    "--cv-font-body": FONTS[s.fonts.body].family,
    "--cv-lh": String(s.lineHeight),
    "--cv-fs-name": `${s.fontSize.name}pt`,
    "--cv-fs-heading": `${s.fontSize.heading}pt`,
    "--cv-fs-body": `${s.fontSize.body}pt`,
    "--cv-fs-section": `${s.fontSize.section}pt`,
    "--cv-fw-name": String(s.fontWeight.name),
    "--cv-fw-heading": String(s.fontWeight.heading),
    "--cv-fw-section": String(s.fontWeight.section),
    "--cv-page-w": `${page.widthMm}mm`,
    "--cv-page-h": `${page.heightMm}mm`,
    "--cv-mx": `${s.page.marginX}mm`,
    "--cv-my": `${s.page.marginY}mm`,
    "--cv-gap-section": `${s.spacing.section}pt`,
    "--cv-gap-title": `${s.spacing.title}pt`,
    "--cv-gap-block": `${s.spacing.block}pt`,
    "--cv-gap-inside": `${s.spacing.inside}pt`,
    "--cv-photo": `${s.photo.size}mm`,
    "--cv-photo-radius": PHOTO_RADIUS[s.photo.shape],
    "--cv-skill-cols": String(s.skillsColumns),
    "--cv-align": s.headerAlign,
  } as CSSProperties
}
