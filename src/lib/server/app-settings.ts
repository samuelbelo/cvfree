import "server-only"

import { promises as fs } from "node:fs"
import path from "node:path"

import { z } from "zod"

import { LOCALES } from "@/lib/resume/schema"

import { config } from "./config"
import { writeJsonAtomic } from "./repo"

/** Instance-wide preferences edited from the Settings page. */
export const appSettingsSchema = z.object({
  defaultTemplate: z.string().catch("lisbon"),
  defaultColor: z.string().catch("#1f4e79"),
  defaultLocale: z.enum(LOCALES).catch("en"),
  ownerName: z.string().catch(""),
})

export type AppSettings = z.infer<typeof appSettingsSchema>

const file = () => path.join(config.dataDir, "settings.json")

export async function getAppSettings(): Promise<AppSettings> {
  try {
    return appSettingsSchema.parse(JSON.parse(await fs.readFile(file(), "utf8")))
  } catch {
    return appSettingsSchema.parse({})
  }
}

export async function saveAppSettings(input: unknown): Promise<AppSettings> {
  const next = appSettingsSchema.parse(input ?? {})
  await writeJsonAtomic(file(), next)
  return next
}
