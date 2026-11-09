/*
 * Plain text to the editor's own HTML. Blank lines separate paragraphs, and a
 * block whose lines all start with "-", "*" or "•" becomes a bullet list.
 * Used where text arrives from outside the editor, such as the MCP server.
 * The result still goes through the sanitizer on save.
 */

const BULLET = /^[-*•]\s+/

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export function textToHtml(text: string): string {
  const blocks = text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length)
  return blocks
    .map((lines) => {
      if (lines.every((l) => BULLET.test(l))) {
        return `<ul>${lines.map((l) => `<li><p>${escape(l.replace(BULLET, ""))}</p></li>`).join("")}</ul>`
      }
      return `<p>${lines.map(escape).join("<br>")}</p>`
    })
    .join("")
}
