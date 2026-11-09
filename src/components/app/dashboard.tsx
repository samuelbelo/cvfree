"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, Download, FileArchive, FileBraces, FilePlus2, FileUp, Mail, Merge, MoreVertical, Pencil, Sparkles, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { CombineDialog } from "@/components/app/combine-dialog"
import { useT } from "@/components/app/i18n-provider"
import { createLetter, LettersPanel } from "@/components/app/letters-panel"
import { PromptDialog } from "@/components/app/prompt-dialog"
import { TemplateThumb } from "@/components/editor/template-thumb"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LetterSummary } from "@/lib/letter/schema"
import { completeness } from "@/lib/resume/analysis"
import type { Resume } from "@/lib/resume/schema"
import { rich } from "@/lib/ui/rich"
import { getTemplate } from "@/templates/registry"

/** Same limit as the server, checked here so a huge file fails before the upload. */
const MAX_UPLOAD = 100 * 1024 * 1024

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

export function Dashboard({
  resumes,
  letters = [],
  unreadable = [],
  dataDir = "",
}: {
  resumes: Resume[]
  letters?: LetterSummary[]
  unreadable?: string[]
  dataDir?: string
}) {
  const t = useT()
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const zipInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [toDelete, setToDelete] = useState<Resume | null>(null)
  const [toRename, setToRename] = useState<Resume | null>(null)
  const [toCombine, setToCombine] = useState<Resume | null>(null)

  const create = async (mode: "blank" | "sample", data?: unknown) => {
    setBusy(true)
    try {
      const created = await api<{ id: string }>("/api/resumes", { method: "POST", body: JSON.stringify({ mode, data }) })
      router.push(`/resumes/${created.id}`)
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Could not create the resume"))
      setBusy(false)
    }
  }

  const importLinkedin = async (file: File) => {
    if (file.size > MAX_UPLOAD) {
      toast.error(t("This file is larger than the 100 MB this app accepts"))
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/import/linkedin", { method: "POST", headers: { "Content-Type": "application/zip" }, body: file })
      const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null
      if (!res.ok || !data?.id) throw new Error(data?.error || t("Import failed ({status})", { status: res.status }))
      toast.success(t("LinkedIn profile imported"), { description: t("Read it through and trim what a resume does not need."), duration: 8000 })
      router.push(`/resumes/${data.id}`)
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Import failed"), { duration: 10000 })
      setBusy(false)
    }
  }

  const importFile = async (file?: File) => {
    if (!file) return
    // Either menu entry takes either file, so a zip picked under "JSON file" still works.
    if (/\.zip$/i.test(file.name) || /zip/i.test(file.type)) return importLinkedin(file)
    try {
      const json = JSON.parse(await file.text())
      const data = json?.resume ?? json
      const created = await api<{ id: string }>("/api/resumes", { method: "POST", body: JSON.stringify({ mode: "import", data }) })
      toast.success(t("Resume imported"))
      router.push(`/resumes/${created.id}`)
    } catch {
      toast.error(t("That file is not a cvfree backup or a JSON Resume file"))
    }
  }

  const duplicate = async (r: Resume) => {
    await api(`/api/resumes/${r.id}/duplicate`, { method: "POST", body: "{}" })
    toast.success(t("Copy created"))
    router.refresh()
  }

  const rename = async (r: Resume, title: string) => {
    if (!title) return
    await api(`/api/resumes/${r.id}`, { method: "PATCH", body: JSON.stringify({ title }) })
    toast.success(t("Renamed"))
    router.refresh()
  }

  const remove = async () => {
    if (!toDelete) return
    await api(`/api/resumes/${toDelete.id}`, { method: "DELETE" })
    toast.success(`"${toDelete.title}" deleted`)
    setToDelete(null)
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {unreadable.length ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              {unreadable.length === 1 ? t("One resume file could not be read") : t("{n} resume files could not be read", { n: unreadable.length })}
            </p>
            <p className="mt-1">
              {unreadable.map((f) => (
                <code key={f} className="mr-2 rounded bg-amber-100 px-1">
                  {f}
                </code>
              ))}
              {rich(t("in {folder}. They were left untouched. Open the file in a text editor, fix the JSON, or import a backup of it."), {
                folder: <code className="rounded bg-amber-100 px-1">{dataDir}/resumes</code>,
              })}
            </p>
          </div>
        </div>
      ) : null}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("Your resumes")}</h1>
          <p className="mt-1 text-muted-foreground">
            {resumes.length
              ? t(resumes.length === 1 ? "1 resume. Saved on your server." : "{n} resumes. Saved on your server.", { n: resumes.length })
              : t("Create your first resume. It takes a few minutes.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" disabled={busy} />}>
              <FileUp /> {t("Import")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem className="items-start" onClick={() => fileInput.current?.click()}>
                <FileBraces className="mt-0.5" />
                <span className="grid gap-0.5">
                  {t("JSON file")}
                  <span className="text-xs text-muted-foreground">{t("A cvfree backup or a JSON Resume file")}</span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="items-start" onClick={() => zipInput.current?.click()}>
                <FileArchive className="mt-0.5" />
                <span className="grid gap-0.5">
                  {t("LinkedIn profile")}
                  <span className="text-xs text-muted-foreground">{t("The zip from Get a copy of your data")}</span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => create("sample")} disabled={busy}>
            <Sparkles /> {t("Start from example")}
          </Button>
          <Button onClick={() => create("blank")} disabled={busy}>
            <FilePlus2 /> {t("New resume")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label={t("JSON file to import")}
            hidden
            onChange={(e) => {
              void importFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <input
            ref={zipInput}
            type="file"
            accept=".zip,application/zip"
            aria-label={t("LinkedIn archive to import")}
            hidden
            onChange={(e) => {
              void importFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
        <button
          type="button"
          onClick={() => create("blank")}
          disabled={busy}
          className="grid aspect-[210/297] place-items-center rounded-xl border-2 border-dashed text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <span className="grid justify-items-center gap-2">
            <FilePlus2 className="size-8" />
            <span className="font-medium">{t("New resume")}</span>
          </span>
        </button>

        {resumes.map((r) => (
          <div key={r.id} className="group grid gap-2">
            <Link
              href={`/resumes/${r.id}`}
              className="relative block overflow-hidden rounded-xl border bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md"
            >
              <TemplateThumb resume={r} />
              <ScoreBadge resume={r} />
            </Link>
            <div className="flex items-start gap-1">
              <Link href={`/resumes/${r.id}`} className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {getTemplate(r.settings.template).name} · {t("edited {date}", { date: r.updatedAt.slice(0, 10) })}
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("Resume actions")} />}>
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push(`/resumes/${r.id}`)}>
                    <Pencil /> {t("Edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setToRename(r)}>
                    <Pencil /> {t("Rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicate(r)}>
                    <Copy /> {t("Duplicate")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createLetter(router, r.id, t)}>
                    <Mail /> {t("New cover letter")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setToCombine(r)} disabled={resumes.length < 2}>
                    <Merge /> {t("Combine with")}
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`/api/resumes/${r.id}/export?format=pdf`} download />}>
                    <Download /> {t("Download PDF")}
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`/api/resumes/${r.id}/export?format=json`} download />}>
                    <Download /> {t("Backup JSON")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setToDelete(r)}>
                    <Trash2 /> {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <LettersPanel letters={letters} resumes={resumes.map((r) => ({ id: r.id, title: r.title }))} />

      <CombineDialog target={toCombine} resumes={resumes} onOpenChange={(open) => !open && setToCombine(null)} />

      <PromptDialog
        open={Boolean(toRename)}
        title={t("Rename resume")}
        initial={toRename?.title ?? ""}
        onOpenChange={(open) => !open && setToRename(null)}
        onConfirm={(title) => toRename && void rename(toRename, title)}
      />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete "{title}"?', { title: toDelete?.title ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("The file is removed from the server. Download a JSON backup first if you may need it.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

/** Same score as the editor's completeness bar, so the dashboard shows which resume still needs work. */
function ScoreBadge({ resume }: { resume: Resume }) {
  const t = useT()
  const { score } = completeness(resume)
  return (
    <span
      className={`absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white shadow ${
        score >= 80 ? "bg-emerald-600" : score >= 50 ? "bg-amber-500" : "bg-rose-500"
      }`}
      title={t("Resume completeness")}
    >
      {score}%
    </span>
  )
}
