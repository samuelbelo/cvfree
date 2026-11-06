"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CloudOff,
  Download,
  FileJson,
  FileText,
  FileType2,
  Loader2,
  Printer,
  Redo2,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LOCALE_NAMES } from "@/lib/resume/i18n"
import { LOCALES, type Locale, type Resume } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { updateResume, useEditor } from "@/store/editor-store"
import { getTemplate } from "@/templates/registry"

import { CustomizePanel } from "./customize-panel"
import { EditPanel } from "./edit-panel"
import { Preview } from "./preview"
import { ReviewPanel } from "./review-panel"
import { TailorPanel } from "./tailor-panel"

type Tab = "edit" | "customize" | "review" | "tailor"
const TABS: { id: Tab; label: string }[] = [
  { id: "edit", label: "Edit" },
  { id: "customize", label: "Customize" },
  { id: "review", label: "Review" },
  { id: "tailor", label: "Tailor" },
]

const SAVE_DELAY = 800

export function EditorShell({ initial, aiEnabled }: { initial: Resume; aiEnabled: boolean }) {
  const resume = useEditor((s) => s.resume)
  const saveState = useEditor((s) => s.saveState)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const [tab, setTab] = useState<Tab>("edit")
  const [mobilePreview, setMobilePreview] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedRevision = useRef(0)

  useEffect(() => {
    useEditor.getState().load(initial)
    return () => useEditor.setState({ resume: null })
  }, [initial])

  const save = useCallback(async () => {
    const { resume: current, revision } = useEditor.getState()
    if (!current || revision === savedRevision.current) return
    useEditor.getState().setSaveState("saving")
    try {
      const res = await fetch(`/api/resumes/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
      })
      if (!res.ok) throw new Error(String(res.status))
      savedRevision.current = revision
      useEditor.getState().setSaveState(useEditor.getState().revision === revision ? "saved" : "saving")
    } catch {
      useEditor.getState().setSaveState("error")
    }
  }, [])

  // Autosave: every change restarts a short timer.
  useEffect(() => {
    return useEditor.subscribe((state, prev) => {
      if (state.revision === prev.revision || !state.resume) return
      useEditor.getState().setSaveState("saving")
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(save, SAVE_DELAY)
    })
  }, [save])

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    await save()
  }, [save])

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().saveState === "saving") {
        void flush()
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [flush])

  // Undo and redo outside text fields (text editors keep their own history).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("input, textarea, [contenteditable=true]")) return
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return
      e.preventDefault()
      if (e.shiftKey) useEditor.getState().redo()
      else useEditor.getState().undo()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!resume) {
    return (
      <div className="grid h-dvh place-items-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  const download = async (format: "pdf" | "docx" | "txt" | "json") => {
    await flush()
    if (format === "docx" && !getTemplate(resume.settings.template).tags.includes("docx")) {
      toast.info("Word export uses a clean single-column layout for this template.")
    }
    const id = toast.loading(`Preparing ${format.toUpperCase()}...`)
    try {
      const res = await fetch(`/api/resumes/${resume.id}/export?format=${format}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Export failed (${res.status})`)
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
      const name = (utf8 ? decodeURIComponent(utf8) : /filename="([^"]+)"/.exec(disposition)?.[1]) ?? `resume.${format}`
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

  const print = async () => {
    await flush()
    const w = window.open(`/print/${resume.id}`, "_blank")
    w?.addEventListener("load", () => setTimeout(() => w.print(), 400))
  }

  return (
    <div className="flex h-dvh flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/" aria-label="Back to dashboard" />}>
          <ArrowLeft />
        </Button>
        <input
          value={resume.title}
          onChange={(e) => updateResume((d) => void (d.title = e.target.value))}
          className="w-24 min-w-0 flex-1 truncate rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none hover:bg-muted focus:bg-muted sm:flex-none md:w-40 lg:w-64"
          aria-label="Resume name"
        />
        <LanguageMenu locale={resume.locale} className="hidden sm:inline-flex" />

        <nav className="mx-auto hidden items-center rounded-lg bg-muted p-1 md:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                tab === t.id && "bg-background font-medium text-foreground shadow-sm"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 md:ml-0">
          <SaveIndicator state={saveState} />
          <Button variant="ghost" size="icon" disabled={!canUndo} onClick={() => useEditor.getState().undo()} aria-label="Undo">
            <Undo2 />
          </Button>
          <Button variant="ghost" size="icon" disabled={!canRedo} onClick={() => useEditor.getState().redo()} aria-label="Redo">
            <Redo2 />
          </Button>
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
              <DropdownMenuItem onClick={print}>
                <Printer /> Print from browser
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b bg-background px-2 py-1.5 md:hidden">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id && !mobilePreview ? "secondary" : "ghost"} onClick={() => { setTab(t.id); setMobilePreview(false) }}>
            {t.label}
          </Button>
        ))}
        <Button size="sm" variant={mobilePreview ? "secondary" : "ghost"} onClick={() => setMobilePreview(true)}>
          Preview
        </Button>
        <LanguageMenu locale={resume.locale} className="ml-auto sm:hidden" />
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(380px,1fr)_minmax(0,1fr)]">
        <ScrollArea className={cn("min-h-0", mobilePreview && "hidden md:block")}>
          <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] p-4 md:p-6">
            {tab === "edit" ? <EditPanel /> : null}
            {tab === "customize" ? <CustomizePanel /> : null}
            {tab === "review" ? <ReviewPanel aiEnabled={aiEnabled} /> : null}
            {tab === "tailor" ? <TailorPanel aiEnabled={aiEnabled} onBeforeLeave={flush} /> : null}
          </div>
        </ScrollArea>
        <Preview resume={resume} className={cn("min-h-0 border-l bg-muted/60", mobilePreview ? "flex" : "hidden md:flex")} />
      </div>
    </div>
  )
}

function LanguageMenu({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className={cn("text-muted-foreground", className)} />}>
        {LOCALE_NAMES[locale]} <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Resume language</DropdownMenuLabel>
          {LOCALES.map((l) => (
            <DropdownMenuItem key={l} onClick={() => updateResume((d) => void (d.locale = l as Locale))}>
              {locale === l ? <Check /> : <span className="size-4" />} {LOCALE_NAMES[l]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Always visible. On narrow screens only the icon shows, with the word in the tooltip. */
function SaveIndicator({ state }: { state: string }) {
  const [icon, text, tone] =
    state === "saving"
      ? [<Loader2 key="i" className="size-3.5 animate-spin" />, "Saving", "text-muted-foreground"]
      : state === "error"
        ? [<CloudOff key="i" className="size-3.5" />, "Not saved", "text-destructive"]
        : [<Check key="i" className="size-3.5" />, "Saved", "text-muted-foreground"]
  return (
    <span className={`flex items-center gap-1 px-1.5 text-xs sm:px-2 ${tone}`} title={text} role="status">
      {icon} <span className={state === "error" ? "" : "hidden sm:inline"}>{text}</span>
    </span>
  )
}
