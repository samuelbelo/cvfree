import "server-only"

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx"

import { formatRange, fullName, hrefFor, htmlToText, prettyUrl, sectionTitle } from "@/lib/resume/format"
import { WORDS } from "@/lib/resume/i18n"
import { getPreset } from "@/lib/resume/presets"
import type { Resume, Section } from "@/lib/resume/schema"
import { hasContent } from "@/templates/blocks"
import { DOCX_FONT } from "@/templates/font-list"
import { PAGE_SIZE } from "@/templates/style"

/*
 * Word export. It always uses a clean single-column layout, because Word and
 * ATS parsers both handle that best. Fonts, color, sizes and margins follow
 * the resume settings.
 */

const MM_TO_TWIP = 56.6929
const pt = (n: number) => Math.round(n * 2) // docx sizes are half-points

type Run = { text: string; bold?: boolean; italics?: boolean; underline?: boolean }

/** Turn the editor HTML into paragraphs with basic bold, italic and bullet support. */
function htmlToParagraphs(html: string, base: { font: string; size: number; spacing: number }): Paragraph[] {
  const out: Paragraph[] = []
  const blocks = html.match(/<(p|li|h\d)[^>]*>[\s\S]*?<\/\1>/gi) ?? (html.trim() ? [`<p>${html}</p>`] : [])
  for (const block of blocks) {
    const isLi = /^<li/i.test(block)
    const inner = block
      .replace(/^<(p|li|h\d)[^>]*>/i, "")
      .replace(/<\/(p|li|h\d)>$/i, "")
      .replace(/<\/?p[^>]*>/gi, "")
    const runs: Run[] = []
    const state = { bold: false, italics: false, underline: false }
    for (const part of inner.split(/(<[^>]+>)/g)) {
      if (!part) continue
      if (part.startsWith("<")) {
        const close = part.startsWith("</")
        const tag = part.replace(/[</>]/g, "").split(/\s/)[0].toLowerCase()
        if (tag === "strong" || tag === "b") state.bold = !close
        if (tag === "em" || tag === "i") state.italics = !close
        if (tag === "u") state.underline = !close
        if (tag === "br") runs.push({ text: "\n" })
        continue
      }
      const text = htmlToText(part)
      if (text) runs.push({ text, ...state })
    }
    if (!runs.length) continue
    out.push(
      new Paragraph({
        numbering: isLi ? { reference: "bullets", level: 0 } : undefined,
        spacing: { after: base.spacing },
        children: runs.map(
          (r) =>
            new TextRun({
              text: r.text,
              bold: r.bold,
              italics: r.italics,
              underline: r.underline ? {} : undefined,
              font: base.font,
              size: base.size,
            })
        ),
      })
    )
  }
  return out
}

function dataUrlToImage(dataUrl: string): { data: Buffer; type: "jpg" | "png" } | null {
  const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(dataUrl)
  if (!m) return null
  return { data: Buffer.from(m[2], "base64"), type: m[1] === "png" ? "png" : "jpg" }
}

export async function renderDocx(resume: Resume): Promise<Buffer> {
  const s = resume.settings
  const words = WORDS[resume.locale]
  const color = s.color.replace("#", "").slice(0, 6)
  const headingFont = DOCX_FONT[s.fonts.heading]
  const bodyFont = DOCX_FONT[s.fonts.body]
  const body = { font: bodyFont, size: pt(s.fontSize.body), spacing: pt(s.spacing.inside) * 10 }
  const page = PAGE_SIZE[s.page.format]
  const children: Paragraph[] = []
  const p = resume.personal

  const photo = s.photo.show && p.photo ? dataUrlToImage(p.photo) : null
  if (photo) {
    const side = Math.round((s.photo.size / 25.4) * 72 * 1.333)
    children.push(
      new Paragraph({
        children: [new ImageRun({ type: photo.type, data: photo.data, transformation: { width: side, height: side } })],
      })
    )
  }

  const align =
    s.headerAlign === "center" ? AlignmentType.CENTER : s.headerAlign === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT

  children.push(
    new Paragraph({
      alignment: align,
      children: [
        new TextRun({
          text: fullName(resume) || "Your Name",
          bold: s.fontWeight.name >= 600,
          font: headingFont,
          size: pt(s.fontSize.name),
          color,
        }),
      ],
    })
  )
  if (p.jobTitle) {
    children.push(
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: p.jobTitle, font: headingFont, size: pt(s.fontSize.heading * 1.1) })],
      })
    )
  }

  const contact: (TextRun | ExternalHyperlink)[] = []
  const pushContact = (text: string, link?: string) => {
    if (!text) return
    if (contact.length) contact.push(new TextRun({ text: "  |  ", font: bodyFont, size: body.size, color: "999999" }))
    const run = new TextRun({ text, font: bodyFont, size: body.size })
    contact.push(link ? new ExternalHyperlink({ link, children: [run] }) : run)
  }
  pushContact([p.city, p.country].filter(Boolean).join(", "))
  pushContact(p.email, p.email ? `mailto:${p.email}` : undefined)
  pushContact(p.phone)
  pushContact(prettyUrl(p.website), p.website ? hrefFor(p.website) : undefined)
  pushContact(prettyUrl(p.linkedin), p.linkedin ? hrefFor(p.linkedin) : undefined)
  if (contact.length) children.push(new Paragraph({ alignment: align, children: contact }))

  const details = [
    [words.address, [p.address, p.postalCode].filter(Boolean).join(", ")],
    [words.nationality, p.nationality],
    [words.dateOfBirth, p.dateOfBirth],
    [words.placeOfBirth, p.placeOfBirth],
    [words.drivingLicense, p.drivingLicense],
  ].filter(([, v]) => v)
  if (details.length) {
    children.push(
      new Paragraph({
        alignment: align,
        children: details.flatMap(([k, v], i) => [
          ...(i ? [new TextRun({ text: "  |  ", font: bodyFont, size: body.size, color: "999999" })] : []),
          new TextRun({ text: `${k}: `, bold: true, font: bodyFont, size: body.size }),
          new TextRun({ text: v, font: bodyFont, size: body.size }),
        ]),
      })
    )
  }

  const rightTab = (page.widthMm - s.page.marginX * 2) * MM_TO_TWIP

  for (const section of resume.sections.filter(hasContent)) {
    const title = sectionTitle(section, resume.locale)
    // A real Heading 1 style, so Word's navigation pane and screen readers see the sections.
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: pt(s.spacing.section) * 10, after: pt(s.spacing.title) * 10 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
        keepNext: true,
        children: [
          new TextRun({
            text: s.uppercaseTitles ? title.toUpperCase() : title,
            bold: s.fontWeight.section >= 600,
            font: headingFont,
            size: pt(s.fontSize.section),
            color,
          }),
        ],
      })
    )
    children.push(...sectionParagraphs(section, resume, { body, headingFont, rightTab }))
  }

  const doc = new Document({
    creator: fullName(resume) || "cvfree",
    title: fullName(resume) ? `${fullName(resume)} – ${resume.title}` : resume.title,
    subject: p.jobTitle,
    styles: {
      default: { document: { run: { font: bodyFont, size: body.size } } },
      // Word's default Heading 1 is big and blue. Override it so the run formatting above is what shows.
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: headingFont, size: pt(s.fontSize.section), bold: s.fontWeight.section >= 600, color },
          paragraph: { outlineLevel: 0 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: page.widthMm * MM_TO_TWIP, height: page.heightMm * MM_TO_TWIP },
            margin: {
              top: s.page.marginY * MM_TO_TWIP,
              bottom: s.page.marginY * MM_TO_TWIP,
              left: s.page.marginX * MM_TO_TWIP,
              right: s.page.marginX * MM_TO_TWIP,
            },
          },
        },
        children,
      },
    ],
  })
  return Packer.toBuffer(doc)
}

function sectionParagraphs(
  section: Section,
  resume: Resume,
  o: { body: { font: string; size: number; spacing: number }; headingFont: string; rightTab: number }
): Paragraph[] {
  const s = resume.settings
  const words = WORDS[resume.locale]
  const out: Paragraph[] = []
  const headingSize = pt(s.fontSize.heading)
  switch (section.kind) {
    case "text":
      return htmlToParagraphs(section.html, o.body)
    case "timeline": {
      const swap = section.type === "education" && s.educationFirst === "institution"
      section.items.forEach((item, idx) => {
        const title = swap ? item.subtitle : item.title
        const subtitle = swap ? item.title : item.subtitle
        const dates = formatRange(item.startDate, item.endDate, item.current, s.dateFormat, resume.locale)
        const heading = [subtitle, item.city].filter(Boolean).join(", ")
        out.push(
          new Paragraph({
            keepNext: true,
            spacing: { before: idx ? pt(s.spacing.block) * 10 : 0 },
            tabStops: [{ type: TabStopType.RIGHT, position: o.rightTab }],
            children: [
              new TextRun({ text: title, bold: s.fontWeight.heading >= 600, font: o.headingFont, size: headingSize }),
              new TextRun({ text: heading ? `${title ? ", " : ""}${heading}` : "", font: o.headingFont, size: headingSize }),
              ...(dates ? [new TextRun({ text: `\t${dates}`, font: o.body.font, size: o.body.size, color: "666666" })] : []),
            ],
          })
        )
        out.push(...htmlToParagraphs(item.description, o.body))
      })
      return out
    }
    case "skills": {
      const preset = getPreset(section.type)
      const labels = preset.languageLevels ? words.languageLevels : words.skillLevels
      const text = section.items
        .filter((i) => i.name.trim())
        .map((i) => (section.showLevel && i.level > 0 ? `${i.name} (${labels[i.level - 1]})` : i.name))
        .join(s.skillsDivider === "," ? ", " : `  ${s.skillsDivider}  `)
      return [new Paragraph({ children: [new TextRun({ text, font: o.body.font, size: o.body.size })] })]
    }
    case "links":
      return section.items
        .filter((i) => i.url.trim())
        .map(
          (i) =>
            new Paragraph({
              children: [
                ...(i.label ? [new TextRun({ text: `${i.label}: `, bold: true, font: o.body.font, size: o.body.size })] : []),
                new ExternalHyperlink({
                  link: hrefFor(i.url),
                  children: [new TextRun({ text: prettyUrl(i.url), font: o.body.font, size: o.body.size, style: "Hyperlink" })],
                }),
              ],
            })
        )
    case "references":
      if (section.onRequest) {
        return [new Paragraph({ children: [new TextRun({ text: words.referencesOnRequest, font: o.body.font, size: o.body.size })] })]
      }
      return section.items
        .filter((i) => i.name.trim())
        .map(
          (i) =>
            new Paragraph({
              spacing: { after: pt(s.spacing.block) * 10 },
              children: [
                new TextRun({ text: i.name, bold: true, font: o.headingFont, size: headingSize }),
                new TextRun({ text: i.company ? `, ${i.company}` : "", font: o.headingFont, size: headingSize }),
                new TextRun({ text: [i.email, i.phone].filter(Boolean).join(" · "), break: 1, font: o.body.font, size: o.body.size, color: "666666" }),
              ],
            })
        )
  }
}
