import "server-only"

import { promises as fs } from "node:fs"
import path from "node:path"

import { config } from "./config"
import { zip, type ZipEntry } from "./zip"

/*
 * The whole instance in one zip: every resume, every cover letter and the
 * settings, laid out like the data folder. Unpacking it into an empty
 * DATA_DIR is a valid restore too.
 */

/** The files as they sit on disk, so a file this version cannot read is still kept. */
async function jsonFiles(folder: string): Promise<ZipEntry[]> {
  const dir = path.join(config.dataDir, folder)
  let names: string[]
  try {
    names = (await fs.readdir(dir)).filter((f) => f.endsWith(".json")).sort()
  } catch {
    return []
  }
  return Promise.all(names.map(async (f) => ({ name: `${folder}/${f}`, data: await fs.readFile(path.join(dir, f)) })))
}

export async function createBackup() {
  const [resumes, letters] = await Promise.all([jsonFiles("resumes"), jsonFiles("letters")])
  const settings = await fs.readFile(path.join(config.dataDir, "settings.json")).catch(() => null)
  const createdAt = new Date()
  const manifest = {
    app: "cvfree",
    backup: 1,
    version: config.version,
    createdAt: createdAt.toISOString(),
    resumes: resumes.length,
    letters: letters.length,
  }
  const entries: ZipEntry[] = [
    { name: "backup.json", data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8") },
    ...(settings ? [{ name: "settings.json", data: settings }] : []),
    ...resumes,
    ...letters,
  ]
  return { zip: zip(entries, createdAt), createdAt, resumes: resumes.length, letters: letters.length }
}
