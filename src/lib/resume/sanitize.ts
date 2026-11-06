/*
 * Allowlist sanitizer for the rich text stored in a resume. The editor only
 * produces paragraphs, lists, basic marks, alignment and links, so that is
 * all that survives. Runs on save and again on render, with no DOM needed.
 */

const ALLOWED = new Set(["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "strike", "a"])
const VOID = new Set(["br"])
const SAFE_HREF = /^(https?:|mailto:|tel:)/i
const ALIGN = /text-align:\s*(left|center|right|justify)/i

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", colon: ":", nbsp: " " }

/** Decode the entities a browser would decode inside an attribute value. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

function encodeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function readAttr(attrs: string, name: string): string | null {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i")
  const m = re.exec(attrs)
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null
}

/** A link target is kept only with a plain web, mail or phone scheme. */
export function safeHref(raw: string): string | null {
  const href = decodeEntities(raw).replace(/[\u0000-\u001f\u007f\s]/g, "")
  if (!href) return null
  if (SAFE_HREF.test(href)) return href
  // No scheme at all ("example.com/jobs"): the templates prefix https.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) return href
  return null
}

export function sanitizeHtml(html: string): string {
  if (!html) return ""
  const stripped = html.replace(/<(script|style|iframe|object|embed|template)[\s\S]*?<\/\1\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "")
  const open: string[] = []
  let out = ""
  const parts = stripped.split(/(<[^>]*>)/)
  for (const part of parts) {
    if (!part) continue
    if (part[0] !== "<") {
      out += part.replace(/</g, "&lt;")
      continue
    }
    const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)\/?>$/.exec(part)
    if (!m) continue
    const closing = m[1] === "/"
    const tag = m[2].toLowerCase()
    if (!ALLOWED.has(tag)) continue
    if (closing) {
      const at = open.lastIndexOf(tag)
      if (at < 0) continue
      // Close anything left open inside it, then the tag itself.
      while (open.length > at) out += `</${open.pop()}>`
      continue
    }
    if (VOID.has(tag)) {
      out += `<${tag}>`
      continue
    }
    let attrs = ""
    if (tag === "p" || tag === "li") {
      const style = readAttr(m[3], "style")
      const align = style ? ALIGN.exec(decodeEntities(style)) : null
      if (align) attrs = ` style="text-align: ${align[1].toLowerCase()}"`
    } else if (tag === "a") {
      const href = readAttr(m[3], "href")
      const safe = href === null ? null : safeHref(href)
      if (!safe) continue // the link text is kept, the anchor is not
      attrs = ` href="${encodeAttr(safe)}" target="_blank" rel="noopener noreferrer nofollow"`
    }
    out += `<${tag}${attrs}>`
    open.push(tag)
  }
  while (open.length) out += `</${open.pop()}>`
  return out
}
