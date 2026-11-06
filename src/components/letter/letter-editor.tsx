"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, ChevronDown, CloudOff, Download, FileJson, FileText, FileType2, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Card } from "@/components/editor/edit-panel"
import { TextField } from "@/components/editor/fields"
import { PagePreview } from "@/components/editor/preview"
import { RichText } from "@/components/editor/rich-text"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { senderFromResume } from "@/lib/letter/defaults"
import { letterClosing, letterDate, letterGreeting } from "@/lib/letter/format"
import type { Letter } from "@/lib/letter/schema"
import { LOCALE_NAMES, WORDS } from "@/lib/resume/i18n"
import { LOCALES, type Locale, type Resume } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { LetterDocument } from "@/templates/letter-document"
import { COLOR_SWATCHES } from "@/templates/registry"

const SAVE_DELAY = 800

type SaveState = "saved" | "saving" | "error" | "conflict"

/**
 * Cover letter editor: form on the left, the letter on the right. Saves on
 * its own after a short pause, like the resume editor, with the same
 * protection against two tabs overwriting each other.
 */
export function LetterEditor({ initial, resumeTitle, aiEnabled }: { initial: Letter; resumeTitle: string | null; aiEnabled: boolean }) {
  const [letter, setLetter] = useState(initial)
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [aiOpen, setAiOpen] = useState(false)
  const [mobilePreview, setMobilePreview] = useState(false)
  const [posting, setPosting] = useState("")
  const [aiBusy, setAiBusy] = useState(false)
  const revision = useRef(0)
  const savedRevision = useRef(0)
  const baseUpdatedAt = useRef(initial.updatedAt)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The latest draft, for the save that runs after the debounce or on unload.
  const latest = useRef(initial)

  const save = useCallback(async (opts: { unloading?: boolean } = {}) => {
    const current = latest.current
    const rev = revision.current
    if (rev === savedRevision.current) return
    setSaveState((s) => (s === "conflict" ? s : "saving"))
    const body = JSON.stringify({ ...current, baseUpdatedAt: baseUpdatedAt.current })
    try {
      const res = await fetch(`/api/letters/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: opts.unloading && body.length < 60_000,
      })
      if (res.status === 409) {
        setSaveState("conflict")
        toast.error("This letter was changed in another tab or window. Reload to see it. Your edits here will not be saved.", {
          id: "conflict",
          duration: Infinity,
          action: { label: "Reload", onClick: () => window.location.reload() },
        })
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { updatedAt?: string }
      if (data.updatedAt) baseUpdatedAt.current = data.updatedAt
      savedRevision.current = rev
      setSaveState(revision.current === rev ? "saved" : "saving")
    } catch {
      setSaveState("error")
    }
  }, [])

  const update = useCallback(
    (recipe: (draft: Letter) => void) => {
      setLetter((prev) => {
        const next = structuredClone(prev)
        recipe(next)
        latest.current = next
        return next
      })
      revision.current++
      if (saveState !== "conflict") setSaveState("saving")
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void save(), SAVE_DELAY)
    },
    [save, saveState]
  )

  useEffect(() => {
    const pending = () => revision.current !== savedRevision.current
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!pending()) return
      if (timer.current) clearTimeout(timer.current)
      void save({ unloading: true })
      e.preventDefault()
    }
    const onHide = () => {
      if (document.visibilityState === "hidden" && pending()) {
        if (timer.current) clearTimeout(timer.current)
        void save({ unloading: true })
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    window.addEventListener("pagehide", onHide)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      window.removeEventListener("pagehide", onHide)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [save])

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    await save()
  }, [save])

  const download = async (format: "pdf" | "docx" | "txt" | "json") => {
    await flush()
    const id = toast.loading(`Preparing ${format.toUpperCase()}...`)
    try {
      const res = await fetch(`/api/letters/${letter.id}/export?format=${format}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Export failed (${res.status})`)
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
      const name = (utf8 ? decodeURIComponent(utf8) : /filename="([^"]+)"/.exec(disposition)?.[1]) ?? `cover-letter.${format}`
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      toast.success(`${name} downloaded`, { id })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed", { id })
    }
  }

  const refreshSender = async () => {
    if (!letter.resumeId) return
    const res = await fetch(`/api/resumes/${letter.resumeId}`)
    if (!res.ok) return toast.error("The resume this letter came from no longer exists.")
    const resume = (await res.json()) as Resume
    update((d) => {
      d.sender = senderFromResume(resume)
      d.settings = { ...resume.settings, headerText: "", footerText: "", pageNumbering: "none" }
    })
    toast.success("Sender details and style copied from the resume")
  }

  const writeWithAi = async () => {
    setAiBusy(true)
    try {
      let resume: Resume | null = null
      if (letter.resumeId) {
        const r = await fetch(`/api/resumes/${letter.resumeId}`)
        if (r.ok) resume = (await r.json()) as Resume
      }
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "letter", letter, resume, jobDescription: posting }),
      })
      const data = (await res.json()) as { paragraphs?: string[]; error?: string }
      if (!res.ok) throw new Error(data.error)
      const html = (data.paragraphs ?? []).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("")
      update((d) => void (d.body = html))
      setAiOpen(false)
      toast.success("Draft written. Read it as the recruiter would, then make it yours.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed")
    } finally {
      setAiBusy(false)
    }
  }

  const w = WORDS[letter.locale]
  const placeholders = useMemo(
    () => ({ date: letterDate(letter), greeting: letterGreeting({ ...letter, greeting: "" }), closing: letterClosing({ ...letter, closing: "" }) }),
    [letter]
  )

  return (
    <div className="flex h-dvh flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/" aria-label="Back to dashboard" />}>
          <ArrowLeft />
        </Button>
        <input
          value={letter.title}
          onChange={(e) => update((d) => void (d.title = e.target.value))}
          className="w-24 min-w-0 flex-1 truncate rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none hover:bg-muted focus:bg-muted sm:flex-none md:w-40 lg:w-64"
          aria-label="Letter name"
        />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex" />}>
            {LOCALE_NAMES[letter.locale]} <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Letter language</DropdownMenuLabel>
              {LOCALES.map((l) => (
                <DropdownMenuItem key={l} onClick={() => update((d) => void (d.locale = l as Locale))}>
                  {letter.locale === l ? <Check /> : <span className="size-4" />} {LOCALE_NAMES[l]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="mx-auto hidden text-xs text-muted-foreground md:inline">Cover letter{resumeTitle ? ` · from "${resumeTitle}"` : ""}</span>
        <div className="flex shrink-0 items-center gap-1">
          <SaveIndicator state={saveState} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button className="ml-1" aria-label="Download" />}>
              <Download /> <span className="hidden sm:inline">Download</span> <ChevronDown className="hidden sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => download("pdf")}>
                <FileText className="text-rose-500" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => download("docx")}>
                <FileType2 className="text-sky-600" /> Word (DOCX)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => download("txt")}>
                <FileText className="text-muted-foreground" /> Plain text (TXT)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => download("json")}>
                <FileJson className="text-amber-600" /> Backup (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <nav className="flex shrink-0 gap-1 border-b bg-background px-2 py-1.5 md:hidden">
        <Button size="sm" variant={mobilePreview ? "ghost" : "secondary"} onClick={() => setMobilePreview(false)}>
          Edit
        </Button>
        <Button size="sm" variant={mobilePreview ? "secondary" : "ghost"} onClick={() => setMobilePreview(true)}>
          Preview
        </Button>
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(380px,1fr)_minmax(0,1fr)]">
        <div className={cn("min-h-0 overflow-y-auto", mobilePreview && "hidden md:block")}>
          <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-4 p-4 md:p-6">
            <Card
              title={<h2 className="font-semibold">You</h2>}
              actions={
                letter.resumeId ? (
                  <Button variant="ghost" size="sm" onClick={refreshSender} className="text-muted-foreground">
                    <RefreshCw /> From resume
                  </Button>
                ) : null
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Full name" value={letter.sender.name} onChange={(v) => update((d) => void (d.sender.name = v))} />
                <TextField label="Job title" value={letter.sender.jobTitle} onChange={(v) => update((d) => void (d.sender.jobTitle = v))} />
                <TextField label="Email" value={letter.sender.email} onChange={(v) => update((d) => void (d.sender.email = v))} />
                <TextField label="Phone" value={letter.sender.phone} onChange={(v) => update((d) => void (d.sender.phone = v))} />
                <TextField label="City, country" value={letter.sender.location} onChange={(v) => update((d) => void (d.sender.location = v))} />
                <TextField label="Website or LinkedIn" value={letter.sender.website} onChange={(v) => update((d) => void (d.sender.website = v))} />
              </div>
            </Card>

            <Card title={<h2 className="font-semibold">Who you are writing to</h2>}>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Company" value={letter.recipient.company} onChange={(v) => update((d) => void (d.recipient.company = v))} />
                <TextField label="Position you apply for" value={letter.recipient.position} onChange={(v) => update((d) => void (d.recipient.position = v))} />
                <TextField label="Hiring manager" value={letter.recipient.name} placeholder="Leave empty if you do not know" onChange={(v) => update((d) => void (d.recipient.name = v))} />
                <TextField label="Address" value={letter.recipient.address} placeholder="Optional" onChange={(v) => update((d) => void (d.recipient.address = v))} />
              </div>
            </Card>

            <Card
              title={<h2 className="font-semibold">Letter</h2>}
              actions={
                <Button variant="outline" size="sm" onClick={() => setAiOpen(true)} disabled={!aiEnabled} title={aiEnabled ? "" : "Configure an AI provider on the server to enable"}>
                  <Sparkles /> Write with AI
                </Button>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Date" value={letter.date} placeholder={placeholders.date} onChange={(v) => update((d) => void (d.date = v))} />
                <TextField label="Greeting" value={letter.greeting} placeholder={placeholders.greeting} onChange={(v) => update((d) => void (d.greeting = v))} />
              </div>
              <RichText
                value={letter.body}
                minHeight={260}
                placeholder="Why this role, what you bring, one result you are proud of, and how to reach you. Three or four short paragraphs."
                onChange={(html) => update((d) => void (d.body = html))}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Recruiters read about 250 to 400 words. Numbers beat adjectives.</span>
                <span className="tabular-nums">{wordCount(letter.body)} words</span>
              </div>
              <TextField label="Sign-off" value={letter.closing} placeholder={placeholders.closing} onChange={(v) => update((d) => void (d.closing = v))} />
            </Card>

            <Card title={<h2 className="font-semibold">Style</h2>} defaultOpen={false}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Main color</span>
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={letter.settings.color === c}
                    onClick={() => update((d) => void (d.settings.color = c))}
                    className={cn("size-7 rounded-full border-2 border-transparent ring-offset-2", letter.settings.color === c && "ring-2 ring-foreground")}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Fonts, sizes and margins follow the resume the letter was made from. Use &ldquo;From resume&rdquo; above to copy them again after changing the resume.
              </p>
            </Card>
          </div>
        </div>
        <PagePreview settings={letter.settings} locale={letter.locale} className={cn("min-h-0 border-l bg-muted/60", mobilePreview ? "flex" : "hidden md:flex")}>
          <LetterDocument letter={letter} />
        </PagePreview>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Write a first draft with AI</DialogTitle>
            <DialogDescription>
              Paste the job posting. The draft uses only what is in your resume and replaces the current text. You then edit it like any text.
              The posting and your resume are sent to the AI provider configured on this server.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={posting} onChange={(e) => setPosting(e.target.value)} placeholder="Job posting..." className="min-h-40 text-sm" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiOpen(false)}>
              Cancel
            </Button>
            <Button onClick={writeWithAi} disabled={aiBusy || posting.trim().length < 80}>
              {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Write draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <span className="sr-only">{w.sincerely}</span>
    </div>
  )
}

function wordCount(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").trim()
  return text ? text.split(/\s+/).length : 0
}

function SaveIndicator({ state }: { state: SaveState }) {
  const [icon, text, tone] =
    state === "saving"
      ? [<Loader2 key="i" className="size-3.5 animate-spin" />, "Saving", "text-muted-foreground"]
      : state === "error"
        ? [<CloudOff key="i" className="size-3.5" />, "Not saved", "text-destructive"]
        : state === "conflict"
          ? [<CloudOff key="i" className="size-3.5" />, "Changed elsewhere", "text-destructive"]
          : [<Check key="i" className="size-3.5" />, "Saved", "text-muted-foreground"]
  const alert = state === "error" || state === "conflict"
  return (
    <span className={`flex items-center gap-1 px-1.5 text-xs sm:px-2 ${tone}`} title={text} role="status">
      {icon} <span className={alert ? "" : "hidden sm:inline"}>{text}</span>
    </span>
  )
}
