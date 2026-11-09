"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, ArchiveRestore, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

type Count = { added: number; updated: number; kept: number }
type RestoreResult = { resumes: Count; letters: Count; settings: boolean; unreadable: number }

/** Same limit as the server, checked here so a huge file fails before the upload. */
const MAX_UPLOAD = 100 * 1024 * 1024

function summary(r: RestoreResult) {
  const added = r.resumes.added + r.letters.added
  const updated = r.resumes.updated + r.letters.updated
  const kept = r.resumes.kept + r.letters.kept
  return [
    added ? `${added} added` : "",
    updated ? `${updated} replaced by the newer copy` : "",
    kept ? `${kept} already up to date` : "",
    r.settings ? "settings restored" : "",
    r.unreadable ? `${plural(r.unreadable, "file", "files")} could not be read` : "",
  ]
    .filter(Boolean)
    .join(", ")
}

/** Everything on this instance as one file, out and back in. */
export function BackupPanel({ resumes, letters }: { resumes: number; letters: number }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<"download" | "restore" | null>(null)

  const download = async () => {
    setBusy("download")
    try {
      const res = await fetch("/api/backup")
      if (!res.ok) throw new Error(`Backup failed (${res.status})`)
      const blob = await res.blob()
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "cvfree-backup.zip"
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      toast.success(`${name} downloaded`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed")
    } finally {
      setBusy(null)
    }
  }

  const restore = async (file: File) => {
    if (file.size > MAX_UPLOAD) {
      toast.error("This file is larger than the 100 MB a backup can be")
      return
    }
    setBusy("restore")
    try {
      const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/zip" }, body: file })
      const data = (await res.json().catch(() => null)) as (RestoreResult & { error?: string }) | null
      if (!res.ok || !data) throw new Error(data?.error || `Restore failed (${res.status})`)
      const changed = data.resumes.added + data.resumes.updated + data.letters.added + data.letters.updated
      const options = { description: summary(data), duration: 8000 }
      if (changed || data.settings) toast.success("Backup restored", options)
      else toast.info("Nothing to restore", options)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-3 px-5 py-4">
      <p className="text-sm text-muted-foreground">
        One zip with {plural(resumes, "resume", "resumes")}, {plural(letters, "cover letter", "cover letters")} and these settings, photos
        included. Version history stays on the server.
      </p>
      <p className="text-sm text-muted-foreground">
        Restoring adds what is missing and replaces a resume or letter only when the backup holds a newer copy. Nothing is deleted.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={download} disabled={busy !== null}>
          {busy === "download" ? <Loader2 className="animate-spin" /> : <Archive />} Download backup
        </Button>
        <Button variant="outline" onClick={() => input.current?.click()} disabled={busy !== null}>
          {busy === "restore" ? <Loader2 className="animate-spin" /> : <ArchiveRestore />} Restore from backup
        </Button>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          aria-label="Backup zip to restore"
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
