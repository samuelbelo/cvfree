/*
 * A small CSV reader for the files other products export. A quoted cell may
 * hold commas, line breaks and doubled quotes.
 */

/** Every row as a list of cells. Rows with nothing in them are dropped. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  const endRow = () => {
    row.push(cell)
    cell = ""
    if (row.some((c) => c.trim() !== "")) rows.push(row)
    row = []
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch !== '"') cell += ch
      else if (src[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = false
    } else if (ch === '"' && cell === "") quoted = true
    else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      endRow()
    } else cell += ch
  }
  if (cell !== "" || row.length) endRow()
  return rows
}

export type CsvRecord = Map<string, string>

/**
 * Rows keyed by the header, with header names in lower case. The header is the
 * first row that holds `column`, so notes placed above the table are skipped.
 */
export function csvRecords(text: string, column: string): CsvRecord[] {
  const rows = parseCsv(text)
  const wanted = column.toLowerCase()
  const at = rows.findIndex((r) => r.some((c) => c.trim().toLowerCase() === wanted))
  if (at < 0) return []
  const header = rows[at].map((c) => c.trim().toLowerCase())
  return rows.slice(at + 1).map((r) => new Map(header.map((name, i) => [name, (r[i] ?? "").trim()])))
}
