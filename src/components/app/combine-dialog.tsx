"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Merge } from "lucide-react"
import { toast } from "sonner"

import { useT } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Resume } from "@/lib/resume/schema"

/** Picks a second resume and creates a new one with the sections of both. */
export function CombineDialog({ target, resumes, onOpenChange }: { target: Resume | null; resumes: Resume[]; onOpenChange: (open: boolean) => void }) {
  const t = useT()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const others = resumes.filter((r) => r.id !== target?.id)

  const combine = async (sourceId: string) => {
    if (!target) return
    setBusy(sourceId)
    try {
      const res = await fetch(`/api/resumes/${target.id}/combine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok || !data.id) throw new Error(data.error ?? "Could not combine")
      toast.success(t("Combined into a new resume. Both originals are unchanged."))
      onOpenChange(false)
      router.push(`/resumes/${data.id}`)
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Could not combine"))
      setBusy(null)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Combine “{title}” with", { title: target?.title ?? "" })}</DialogTitle>
          <DialogDescription>
            {t("A new resume gets every section of both. Summary, skills and languages are merged, jobs and education are appended. The two originals stay as they are.")}
          </DialogDescription>
        </DialogHeader>
        {others.length ? (
          <ul className="grid max-h-[50vh] gap-1.5 overflow-y-auto">
            {others.map((r) => (
              <li key={r.id}>
                <Button variant="outline" className="h-auto w-full justify-start py-2" disabled={busy !== null} onClick={() => combine(r.id)}>
                  {busy === r.id ? <Loader2 className="animate-spin" /> : <Merge />}
                  <span className="min-w-0 truncate">{r.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{t("{n} sections", { n: r.sections.length })}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">{t("You need a second resume to combine with.")}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
