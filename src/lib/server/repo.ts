import "server-only"

import { promises as fs } from "node:fs"
import path from "node:path"

import { normalizeResume } from "@/lib/resume/defaults"
import { fullName } from "@/lib/resume/format"
import type { Resume, ResumeSummary } from "@/lib/resume/schema"

import { config } from "./config"

/*
 * Resumes are plain JSON files in DATA_DIR/resumes. No database to run, and
 * backing up is copying a folder. Swap this module to move to a real database.
 */

const resumesDir = () => path.join(config.dataDir, "resumes")
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

function fileFor(id: string) {
  if (!SAFE_ID.test(id)) throw new Error("Invalid resume id")
  return path.join(resumesDir(), `${id}.json`)
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

/** Write to a temp file and rename, so a crash never leaves half a JSON file. */
export async function writeJsonAtomic(file: string, value: unknown) {
  await ensureDir(path.dirname(file))
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8")
  await fs.rename(tmp, file)
}

/** Every resume, newest first. Files that fail to parse are skipped. */
export async function getAllResumes(): Promise<Resume[]> {
  await ensureDir(resumesDir())
  const files = (await fs.readdir(resumesDir())).filter((f) => f.endsWith(".json"))
  const items = await Promise.all(
    files.map(async (f) => {
      try {
        return normalizeResume(JSON.parse(await fs.readFile(path.join(resumesDir(), f), "utf8")))
      } catch {
        return null
      }
    })
  )
  return items.filter((r): r is Resume => r !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * Files in the resumes folder that could not be parsed. They are never
 * touched, so the dashboard can point at them instead of hiding them.
 */
export async function getUnreadableResumeFiles(): Promise<string[]> {
  await ensureDir(resumesDir())
  const files = (await fs.readdir(resumesDir())).filter((f) => f.endsWith(".json"))
  const bad: string[] = []
  for (const f of files) {
    try {
      normalizeResume(JSON.parse(await fs.readFile(path.join(resumesDir(), f), "utf8")))
    } catch {
      bad.push(f)
    }
  }
  return bad
}

export async function listResumes(): Promise<ResumeSummary[]> {
  return (await getAllResumes()).map(toSummary)
}

export function toSummary(resume: Resume): ResumeSummary {
  return {
    id: resume.id,
    title: resume.title,
    locale: resume.locale,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
    template: resume.settings.template,
    fullName: fullName(resume),
    jobTitle: resume.personal.jobTitle,
  }
}

export async function getResume(id: string): Promise<Resume | null> {
  try {
    return normalizeResume(JSON.parse(await fs.readFile(fileFor(id), "utf8")))
  } catch {
    return null
  }
}

const SHARE_TOKEN = /^[A-Za-z0-9_-]{20,64}$/

/** The resume behind a public link, or null when the token is unknown or was revoked. */
export async function getResumeByShareToken(token: string): Promise<Resume | null> {
  if (!SHARE_TOKEN.test(token)) return null
  return (await getAllResumes()).find((r) => r.shareToken === token) ?? null
}

export async function saveResume(resume: Resume): Promise<Resume> {
  const next = normalizeResume({ ...resume, updatedAt: new Date().toISOString() })
  await snapshotBeforeWrite(next.id)
  await writeJsonAtomic(fileFor(next.id), next)
  return next
}

/* ------------------------------------------------------------------ */
/* Version history                                                     */
/* ------------------------------------------------------------------ */

const SNAPSHOT_EVERY_MS = 10 * 60 * 1000
const SNAPSHOTS_KEPT = 30

const historyDir = (id: string) => path.join(config.dataDir, "history", id)

/** File name is the moment the copy was taken, so sorting by name sorts by time. */
const snapshotName = (iso: string) => `${iso.replace(/[:.]/g, "-")}.json`

export type Snapshot = { at: string; title: string; bytes: number }

/**
 * Before a save overwrites the file, keep a copy of what was there, at most
 * one every ten minutes. Thirty copies are kept, so a few days of edits can
 * be undone even after the tab was closed.
 */
async function snapshotBeforeWrite(id: string) {
  let current: string
  try {
    current = await fs.readFile(fileFor(id), "utf8")
  } catch {
    return
  }
  const snapshots = await listSnapshots(id)
  const last = snapshots[0]
  if (last && Date.now() - new Date(last.at).getTime() < SNAPSHOT_EVERY_MS) return
  let updatedAt = new Date().toISOString()
  try {
    updatedAt = normalizeResume(JSON.parse(current)).updatedAt
  } catch {
    return
  }
  await ensureDir(historyDir(id))
  await fs.writeFile(path.join(historyDir(id), snapshotName(updatedAt)), current, "utf8")
  for (const old of snapshots.slice(SNAPSHOTS_KEPT - 1)) {
    await fs.unlink(path.join(historyDir(id), snapshotName(old.at))).catch(() => {})
  }
}

/** Newest first. */
export async function listSnapshots(id: string): Promise<Snapshot[]> {
  fileFor(id)
  let files: string[]
  try {
    files = (await fs.readdir(historyDir(id))).filter((f) => f.endsWith(".json")).sort().reverse()
  } catch {
    return []
  }
  const out: Snapshot[] = []
  for (const f of files) {
    try {
      const raw = await fs.readFile(path.join(historyDir(id), f), "utf8")
      const r = normalizeResume(JSON.parse(raw))
      out.push({ at: r.updatedAt, title: r.title, bytes: Buffer.byteLength(raw) })
    } catch {
      // A damaged snapshot is skipped, never deleted.
    }
  }
  return out
}

export async function getSnapshot(id: string, at: string): Promise<Resume | null> {
  try {
    return normalizeResume(JSON.parse(await fs.readFile(path.join(historyDir(id), snapshotName(at)), "utf8")))
  } catch {
    return null
  }
}

/** The current file is snapshotted first, so a restore can itself be undone. */
export async function restoreSnapshot(id: string, at: string): Promise<Resume | null> {
  const snapshot = await getSnapshot(id, at)
  if (!snapshot) return null
  const current = await getResume(id)
  if (current) {
    await ensureDir(historyDir(id))
    await fs.writeFile(path.join(historyDir(id), snapshotName(current.updatedAt)), JSON.stringify(current, null, 2), "utf8")
  }
  const restored = normalizeResume({ ...snapshot, id, updatedAt: new Date().toISOString() })
  await writeJsonAtomic(fileFor(id), restored)
  return restored
}

export async function deleteResume(id: string): Promise<boolean> {
  try {
    await fs.unlink(fileFor(id))
    return true
  } catch {
    return false
  }
}
