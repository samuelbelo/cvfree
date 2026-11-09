"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, ArchiveRestore, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useT } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"
import type { Translate } from "@/lib/ui/translate"

type Count = { added: number; updated: number; kept: number }
type RestoreResult = { resumes: Count; letters: Count; settings: boolean; unreadable: number }

/** Same limit as the server, checked here so a huge file fails before the upload. */
const MAX_UPLOAD = 100 * 1024 * 1024

function summary(r: RestoreResult, t: Translate) {
  const added = r.resumes.added + r.letters.added
  const updated = r.resumes.updated + r.letters.updated
  const kept = r.resumes.kept + r.letters.kept
  return [
    added ? t("{n} added", { n: added }) : "",
    updated ? t("{n} replaced by the newer copy", { n: updated }) : "",
    kept ? t("{n} already up to date", { n: kept }) : "",
    r.settings ? t("settings restored") : "",
    r.unreadable ? t(r.unreadable === 1 ? "1 file could not be read" : "{n} files could not be read", { n: r.unreadable }) : "",
  ]
    .filter(Boolean)
    .join(", ")
}

/** Everything on this instance as one file, out and back in. */
export function BackupPanel({ resumes, letters }: { resumes: number; letters: number }) {
  const t = useT()
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<"download" | "restore" | null>(null)

  const download = async () => {
    setBusy("download")
    try {
      const res = await fetch("/api/backup")
      if (!res.ok) throw new Error(t("Backup failed ({status})", { status: res.status }))
      const blob = await res.blob()
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "cvfree-backup.zip"
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      toast.success(t("{name} downloaded", { name }))
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Backup failed"))
    } finally {
      setBusy(null)
    }
  }

  const restore = async (file: File) => {
    if (file.size > MAX_UPLOAD) {
      toast.error(t("This file is larger than the 100 MB a backup can be"))
      return
    }
    setBusy("restore")
    try {
      const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/zip" }, body: file })
      const data = (await res.json().catch(() => null)) as (RestoreResult & { error?: string }) | null
      if (!res.ok || !data) throw new Error(data?.error || t("Restore failed ({status})", { status: res.status }))
      const changed = data.resumes.added + data.resumes.updated + data.letters.added + data.letters.updated
      const options = { description: summary(data, t), duration: 8000 }
      if (changed || data.settings) toast.success(t("Backup restored"), options)
      else toast.info(t("Nothing to restore"), options)
      router.refresh()
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Restore failed"))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-3 px-5 py-4">
      <p className="text-sm text-muted-foreground">
        {t("One zip with {resumes}, {letters} and these settings, photos included. Version history stays on the server.", {
          resumes: t(resumes === 1 ? "1 resume" : "{n} resumes", { n: resumes }),
          letters: t(letters === 1 ? "1 cover letter" : "{n} cover letters", { n: letters }),
        })}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("Restoring adds what is missing and replaces a resume or letter only when the backup holds a newer copy. Nothing is deleted.")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={download} disabled={busy !== null}>
          {busy === "download" ? <Loader2 className="animate-spin" /> : <Archive />} {t("Download backup")}
        </Button>
        <Button variant="outline" onClick={() => input.current?.click()} disabled={busy !== null}>
          {busy === "restore" ? <Loader2 className="animate-spin" /> : <ArchiveRestore />} {t("Restore from backup")}
        </Button>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          aria-label={t("Backup zip to restore")}
          onChange={(e) => {
            const file = e.target.files?.[0]
            // Cleared so the same file can be picked again.
            e.target.value = ""
            if (file) void restore(file)
          }}
        />
      </div>
    </div>
  )
}
