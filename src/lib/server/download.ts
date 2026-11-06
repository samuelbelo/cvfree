/**
 * Content-Disposition with two names: an ASCII one for old clients and the
 * real one in UTF-8 (RFC 5987), so a name in any script stays on the file.
 */
export function contentDisposition(disposition: "attachment" | "inline", base: string, ext: string) {
  const trimmed = base.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim()
  const ascii = trimmed
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
  const utf8 = (trimmed || "resume").replace(/\s/g, "_")
  const fallback = `${ascii || "resume"}.${ext}`
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(`${utf8}.${ext}`)}`
}
