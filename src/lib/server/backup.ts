import "server-only"

import { promises as fs } from "node:fs"
import path from "node:path"

import { normalizeLetter } from "@/lib/letter/defaults"
import { normalizeResume } from "@/lib/resume/defaults"

import { restoreAppSettings } from "./app-settings"
import { config } from "./config"
import { getLetter, restoreLetter } from "./letters"
import { getResume, restoreResume } from "./repo"
import { unzip, zip, type ZipEntry } from "./zip"

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

/* ------------------------------------------------------------------ */
/* Restore                                                             */
/* ------------------------------------------------------------------ */

/** A problem with the uploaded file, safe to show to the person who sent it. */
export class BackupError extends Error {}

export type RestoreCount = { added: number; updated: number; kept: number }
export type RestoreResult = {
  resumes: RestoreCount
  letters: RestoreCount
  /** True when the settings came from the backup. */
  settings: boolean
  /** Files in the zip that are not a resume or a letter this version can read. */
  unreadable: number
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/
/** The data folder at the top of the zip, or one folder down when someone zipped the folder itself. */
const WANTED = /^(?:[^/]+\/)?(?:(resumes|letters)\/[A-Za-z0-9_-]{1,64}\.json|settings\.json)$/

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v)

/** Dates from the file as clean ISO strings. They end up in file names, so nothing else gets through. */
function isoDate(value: unknown) {
  const time = typeof value === "string" ? Date.parse(value) : NaN
  return Number.isNaN(time) ? null : new Date(time).toISOString()
}

/** The id and dates every stored document carries, or null when the file is something else. */
function storedHead(raw: unknown) {
  if (!isObject(raw) || typeof raw.id !== "string" || !SAFE_ID.test(raw.id)) return null
  const updatedAt = isoDate(raw.updatedAt)
  const createdAt = isoDate(raw.createdAt) ?? updatedAt
  if (!updatedAt || !createdAt) return null
  return { raw, createdAt, updatedAt }
}

const newerThan = (backup: string, current: string) => {
  const here = Date.parse(current)
  return Number.isNaN(here) || Date.parse(backup) > here
}

/**
 * Merge a backup into this instance. What is missing is added, a copy that is
 * newer in the backup replaces the one here, and nothing is ever deleted.
 */
export async function restoreBackup(buffer: Buffer): Promise<RestoreResult> {
  let entries: ZipEntry[]
  try {
    entries = unzip(buffer, {
      maxEntries: 20_000,
      maxEntryBytes: 20 * 1024 * 1024,
      maxTotalBytes: 500 * 1024 * 1024,
      filter: (name) => WANTED.test(name),
    })
  } catch (error) {
    throw new BackupError(error instanceof Error ? error.message : "This zip could not be read")
  }

  const documents = entries.filter((e) => !e.name.endsWith("settings.json"))
  if (documents.length === 0) throw new BackupError("This zip holds no cvfree resumes or cover letters")

  const result: RestoreResult = {
    resumes: { added: 0, updated: 0, kept: 0 },
    letters: { added: 0, updated: 0, kept: 0 },
    settings: false,
    unreadable: 0,
  }

  for (const entry of documents) {
    const isResume = /(?:^|\/)resumes\/[^/]+$/.test(entry.name)
    const count = isResume ? result.resumes : result.letters
    try {
      const head = storedHead(JSON.parse(entry.data.toString("utf8")))
      if (!head) throw new Error("not a stored document")
      const { raw, createdAt, updatedAt } = head
      if (isResume) {
        if (!isObject(raw.personal) || !Array.isArray(raw.sections)) throw new Error("not a resume")
        const resume = normalizeResume({ ...raw, createdAt, updatedAt })
        const current = await getResume(resume.id)
        if (current && !newerThan(updatedAt, current.updatedAt)) count.kept++
        else {
          await restoreResume(resume)
          if (current) count.updated++
          else count.added++
        }
      } else {
        if (!isObject(raw.sender) || typeof raw.body !== "string") throw new Error("not a letter")
        const letter = normalizeLetter({ ...raw, createdAt, updatedAt })
        const current = await getLetter(letter.id)
        if (current && !newerThan(updatedAt, current.updatedAt)) count.kept++
        else {
          await restoreLetter(letter)
          if (current) count.updated++
          else count.added++
        }
      }
    } catch {
      result.unreadable++
    }
  }

  const settings = entries.find((e) => e.name.endsWith("settings.json"))
  if (settings) {
    try {
      result.settings = await restoreAppSettings(JSON.parse(settings.data.toString("utf8")))
    } catch {
      // Settings that cannot be read are left out. The defaults stay.
    }
  }
  return result
}
