"use client"

import { useState } from "react"
import { Archive, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Everything on this instance as one file. */
export function BackupPanel({ resumes, letters }: { resumes: number; letters: number }) {
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
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
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3 px-5 py-4">
      <p className="text-sm text-muted-foreground">
        One zip with {plural(resumes, "resume", "resumes")}, {plural(letters, "cover letter", "cover letters")} and these settings, photos
        included. Version history stays on the server.
      </p>
      <Button variant="outline" className="w-fit" onClick={download} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Archive />} Download backup
      </Button>
    </div>
  )
}
