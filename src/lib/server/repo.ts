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

export async function saveResume(resume: Resume): Promise<Resume> {
  const next = normalizeResume({ ...resume, updatedAt: new Date().toISOString() })
  await writeJsonAtomic(fileFor(next.id), next)
  return next
}

export async function deleteResume(id: string): Promise<boolean> {
  try {
    await fs.unlink(fileFor(id))
    return true
  } catch {
    return false
  }
}
