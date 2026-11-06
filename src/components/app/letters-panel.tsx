"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Download, Mail, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PromptDialog } from "@/components/app/prompt-dialog"
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LetterSummary } from "@/lib/letter/schema"
import type { ResumeSummary } from "@/lib/resume/schema"

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

/** Creates a letter from a resume (or blank) and opens it. Shared by the dashboard menus. */
export async function createLetter(router: ReturnType<typeof useRouter>, resumeId: string | null) {
  try {
    const created = await api<{ id: string }>("/api/letters", { method: "POST", body: JSON.stringify({ resumeId }) })
    router.push(`/letters/${created.id}`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not create the letter")
  }
}

export function NewLetterMenu({ resumes, variant = "outline" }: { resumes: Pick<ResumeSummary, "id" | "title">[]; variant?: "outline" | "default" }) {
  const router = useRouter()
  if (!resumes.length) {
    return (
      <Button variant={variant} onClick={() => createLetter(router, null)}>
        <Mail /> New cover letter
      </Button>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant={variant} />}>
        <Mail /> New cover letter <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* A label must sit inside a group, or the menu crashes on open. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Take name, contact and style from</DropdownMenuLabel>
          {resumes.map((r) => (
            <DropdownMenuItem key={r.id} onClick={() => createLetter(router, r.id)}>
              {r.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => createLetter(router, null)}>Start blank</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LettersPanel({ letters, resumes }: { letters: LetterSummary[]; resumes: Pick<ResumeSummary, "id" | "title">[] }) {
  const router = useRouter()
  const [toDelete, setToDelete] = useState<LetterSummary | null>(null)
  const [toRename, setToRename] = useState<LetterSummary | null>(null)

  const rename = async (l: LetterSummary, title: string) => {
    if (!title) return
    await api(`/api/letters/${l.id}`, { method: "PATCH", body: JSON.stringify({ title }) })
    toast.success("Renamed")
    router.refresh()
  }

  const remove = async () => {
    if (!toDelete) return
    await api(`/api/letters/${toDelete.id}`, { method: "DELETE" })
    toast.success(`"${toDelete.title}" deleted`)
    setToDelete(null)
    router.refresh()
  }

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cover letters</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {letters.length
              ? `${letters.length} letter${letters.length === 1 ? "" : "s"}. Each one matches the style of the resume it came from.`
              : "A short letter per application, with your resume's name, contact details and colors already in place."}
          </p>
        </div>
        <NewLetterMenu resumes={resumes} />
      </div>
      {letters.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {letters.map((l) => (
            <div key={l.id} className="group flex items-start gap-2 rounded-xl border bg-card p-4 shadow-xs transition hover:shadow-md">
              <Link href={`/letters/${l.id}`} className="flex min-w-0 flex-1 gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{l.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[l.company, l.position].filter(Boolean).join(" · ") || "No company yet"} · edited {l.updatedAt.slice(0, 10)}
                  </span>
                </span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Letter actions" />}>
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push(`/letters/${l.id}`)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setToRename(l)}>
                    <Pencil /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`/api/letters/${l.id}/export?format=pdf`} download />}>
                    <Download /> Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`/api/letters/${l.id}/export?format=docx`} download />}>
                    <Download /> Download Word
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setToDelete(l)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : null}

      <PromptDialog
        open={Boolean(toRename)}
        title="Rename cover letter"
        initial={toRename?.title ?? ""}
        onOpenChange={(open) => !open && setToRename(null)}
        onConfirm={(title) => toRename && void rename(toRename, title)}
      />
      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{toDelete?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>The file is removed from the server.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
