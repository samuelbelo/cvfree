import "server-only"

import { promises as fs } from "node:fs"
import path from "node:path"

import { normalizeLetter, toLetterSummary } from "@/lib/letter/defaults"
import type { Letter, LetterSummary } from "@/lib/letter/schema"

import { config } from "./config"
import { writeJsonAtomic } from "./repo"

/* Cover letters: one JSON file each in DATA_DIR/letters, like the resumes. */

const lettersDir = () => path.join(config.dataDir, "letters")
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

function fileFor(id: string) {
  if (!SAFE_ID.test(id)) throw new Error("Invalid letter id")
  return path.join(lettersDir(), `${id}.json`)
}

export async function getAllLetters(): Promise<Letter[]> {
  await fs.mkdir(lettersDir(), { recursive: true })
  const files = (await fs.readdir(lettersDir())).filter((f) => f.endsWith(".json"))
  const items = await Promise.all(
    files.map(async (f) => {
      try {
        return normalizeLetter(JSON.parse(await fs.readFile(path.join(lettersDir(), f), "utf8")))
      } catch {
        return null
      }
    })
  )
  return items.filter((l): l is Letter => l !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function listLetters(): Promise<LetterSummary[]> {
  return (await getAllLetters()).map(toLetterSummary)
}

export async function getLetter(id: string): Promise<Letter | null> {
  try {
    return normalizeLetter(JSON.parse(await fs.readFile(fileFor(id), "utf8")))
  } catch {
    return null
  }
}

export async function saveLetter(letter: Letter): Promise<Letter> {
  const next = normalizeLetter({ ...letter, updatedAt: new Date().toISOString() })
  await writeJsonAtomic(fileFor(next.id), next)
  return next
}

/** Put a cover letter from a backup in place as it was saved, dates included. */
export async function restoreLetter(letter: Letter): Promise<void> {
  await writeJsonAtomic(fileFor(letter.id), letter)
}

export async function deleteLetter(id: string): Promise<boolean> {
  try {
    await fs.unlink(fileFor(id))
    return true
  } catch {
    return false
  }
}
