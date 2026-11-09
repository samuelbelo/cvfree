"use client"

import { useEffect, useState } from "react"
import { History, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { useT, useUiLocale } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Resume } from "@/lib/resume/schema"

type Snapshot = { at: string; title: string; bytes: number }

/** Lists the saved versions of the resume and restores one on request. */
export function HistoryDialog({
  resumeId,
  open,
  onOpenChange,
  onRestored,
}: {
  resumeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestored: (resume: Resume) => void
}) {
  const t = useT()
  // The parent remounts this dialog (a new key) on every opening, so items start empty each time.
  const [items, setItems] = useState<Snapshot[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch(`/api/resumes/${resumeId}/history`)
      .then((r) => r.json())
      .then((data: Snapshot[]) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [open, resumeId])

  const restore = async (at: string) => {
    setBusy(at)
    try {
      const res = await fetch(`/api/resumes/${resumeId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ at }),
      })
      const data = (await res.json()) as Resume & { error?: string }
      if (!res.ok) throw new Error(data.error)
      onRestored(data)
      onOpenChange(false)
      toast.success(t("Version restored. The one it replaced is in the history too."))
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Could not restore"))
    } finally {
      setBusy(null)
    }
  }

  const uiLocale = useUiLocale()
  const when = (iso: string) => new Date(iso).toLocaleString(uiLocale, { dateStyle: "medium", timeStyle: "short" })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Version history")}</DialogTitle>
          <DialogDescription>
            {t("A copy is kept before each save, at most one every ten minutes, up to thirty. Restoring puts that copy back as the current resume.")}
          </DialogDescription>
        </DialogHeader>
        {items === null ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("Loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="grid justify-items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <History className="size-6" />
            {t("No earlier versions yet. The first one appears after the next save.")}
          </div>
        ) : (
          <ul className="grid max-h-[50vh] grid-cols-[minmax(0,1fr)] gap-1.5 overflow-y-auto">
            {items.map((s) => (
              <li key={s.at} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{when(s.at)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.title} · {Math.round(s.bytes / 1024)} KB
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => restore(s.at)}>
                  {busy === s.at ? <Loader2 className="animate-spin" /> : <RotateCcw />} {t("Restore")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
