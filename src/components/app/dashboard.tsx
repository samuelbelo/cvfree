"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, Download, FilePlus2, FileUp, MoreVertical, Pencil, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

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
import type { Resume } from "@/lib/resume/schema"
import { getTemplate } from "@/templates/registry"

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

export function Dashboard({ resumes }: { resumes: Resume[] }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [toDelete, setToDelete] = useState<Resume | null>(null)
  const [toRename, setToRename] = useState<Resume | null>(null)

  const create = async (mode: "blank" | "sample", data?: unknown) => {
    setBusy(true)
    try {
      const created = await api<{ id: string }>("/api/resumes", { method: "POST", body: JSON.stringify({ mode, data }) })
      router.push(`/resumes/${created.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the resume")
      setBusy(false)
    }
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      const data = json?.resume ?? json
      const created = await api<{ id: string }>("/api/resumes", { method: "POST", body: JSON.stringify({ mode: "import", data }) })
      toast.success("Resume imported")
      router.push(`/resumes/${created.id}`)
    } catch {
      toast.error("That file is not a cvfree JSON backup")
    }
  }

  const duplicate = async (r: Resume) => {
    await api(`/api/resumes/${r.id}/duplicate`, { method: "POST", body: "{}" })
    toast.success("Copy created")
    router.refresh()
  }

  const rename = async (r: Resume, title: string) => {
    if (!title) return
    await api(`/api/resumes/${r.id}`, { method: "PATCH", body: JSON.stringify({ title }) })
    toast.success("Renamed")
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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your resumes</h1>
          <p className="mt-1 text-muted-foreground">
            {resumes.length ? `${resumes.length} resume${resumes.length === 1 ? "" : "s"}. Saved on your server.` : "Create your first resume. It takes a few minutes."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
            <FileUp /> Import JSON
          </Button>
          <Button variant="outline" onClick={() => create("sample")} disabled={busy}>
            <Sparkles /> Start from example
          </Button>
          <Button onClick={() => create("blank")} disabled={busy}>
            <FilePlus2 /> New resume
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
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
            <span className="font-medium">New resume</span>
          </span>
        </button>

        {resumes.map((r) => (
          <div key={r.id} className="group grid gap-2">
            <Link
              href={`/resumes/${r.id}`}
              className="relative block overflow-hidden rounded-xl border bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md"
            >
              <TemplateThumb resume={r} />
            </Link>
            <div className="flex items-start gap-1">
              <Link href={`/resumes/${r.id}`} className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {getTemplate(r.settings.template).name} · edited {r.updatedAt.slice(0, 10)}
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Resume actions" />}>
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push(`/resumes/${r.id}`)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setToRename(r)}>
                    <Pencil /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicate(r)}>
                    <Copy /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`/api/resumes/${r.id}/export?format=pdf`} download />}>
                    <Download /> Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`/api/resumes/${r.id}/export?format=json`} download />}>
                    <Download /> Backup JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setToDelete(r)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <PromptDialog
        open={Boolean(toRename)}
        title="Rename resume"
        initial={toRename?.title ?? ""}
        onOpenChange={(open) => !open && setToRename(null)}
        onConfirm={(title) => toRename && void rename(toRename, title)}
      />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{toDelete?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>The file is removed from the server. Download a JSON backup first if you may need it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
