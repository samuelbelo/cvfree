"use client"

import { useState } from "react"
import { Check, Copy, ExternalLink, Link2, Share2, X } from "lucide-react"
import { nanoid } from "nanoid"
import { toast } from "sonner"

import { useT } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { updateResume, useResume } from "@/store/editor-store"

/**
 * Public read-only link. The token is generated here and saved with the
 * resume by the normal autosave, so the server needs no extra endpoint and
 * the editor's conflict check keeps working.
 */
export function ShareDialog() {
  const t = useT()
  const token = useResume().shareToken
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/s/${token}` : ""

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t("Could not copy. Select the link and copy it by hand."))
    }
  }

  return (
    <>
      <Button variant={token ? "secondary" : "ghost"} size="sm" onClick={() => setOpen(true)} aria-label={t("Share")}>
        <Share2 /> <span className="hidden sm:inline">{t("Share")}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Public link")}</DialogTitle>
            <DialogDescription>
              {t("Anyone with the link can see this resume and download the PDF or Word file. They cannot edit it. The link keeps showing the latest saved version until you revoke it.")}
            </DialogDescription>
          </DialogHeader>
          {token ? (
            <div className="grid gap-3">
              <div className="flex gap-2">
                <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={t("Public link")} className="h-10 font-mono text-xs" />
                <Button variant="outline" className="h-10 shrink-0" onClick={copy}>
                  {copied ? <Check /> : <Copy />} {copied ? t("Copied") : t("Copy")}
                </Button>
              </div>
              <DialogFooter className="sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    updateResume((d) => void (d.shareToken = null))
                    toast.success(t("Link revoked. It stops working as soon as the resume is saved."))
                  }}
                >
                  <X /> {t("Revoke link")}
                </Button>
                <Button variant="outline" nativeButton={false} render={<a href={url} target="_blank" rel="noreferrer" />}>
                  <ExternalLink /> {t("Open")}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter>
              <Button
                onClick={() => {
                  updateResume((d) => void (d.shareToken = nanoid(24)))
                }}
              >
                <Link2 /> {t("Create public link")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
