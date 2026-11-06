"use client"

import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PHRASE_FAMILIES, phraseLang, phrasesFor, type PhraseKind } from "@/lib/resume/phrases"
import type { Locale } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"

/**
 * "Help me write": sentences with placeholders, by role family. Clicking one
 * inserts it, and the dialog stays open so several can be added in a row.
 */
export function PhraseDialog({
  open,
  onOpenChange,
  kind,
  locale,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: PhraseKind
  locale: Locale
  onPick: (text: string) => void
}) {
  const lang = phraseLang(locale)
  const [family, setFamily] = useState(PHRASE_FAMILIES[0].id)
  const [query, setQuery] = useState("")
  const [added, setAdded] = useState<string[]>([])

  const phrases = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return phrasesFor(family, kind, locale)
    return PHRASE_FAMILIES.flatMap((f) => (kind === "summary" ? f.summaries[lang] : f.bullets[lang])).filter((p) => p.toLowerCase().includes(q))
  }, [family, kind, lang, locale, query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{kind === "summary" ? "Summary starters" : "Bullet starters"}</DialogTitle>
          <DialogDescription>
            Pick a sentence, then replace everything in [brackets] with your own names and numbers. Keep only numbers you can back up in an
            interview.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all families..." className="h-9 pl-9" aria-label="Search phrases" />
        </div>
        {!query.trim() ? (
          <div className="flex flex-wrap gap-1.5">
            {PHRASE_FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFamily(f.id)}
                aria-pressed={family === f.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition hover:bg-muted",
                  family === f.id && "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {f.label[lang]}
              </button>
            ))}
          </div>
        ) : null}
        <ul className="grid max-h-[50vh] gap-1.5 overflow-y-auto pr-1">
          {phrases.map((p) => (
            <li key={p}>
              <Button
                variant="outline"
                className={cn("h-auto w-full justify-start gap-2 whitespace-normal py-2 text-left font-normal", added.includes(p) && "border-emerald-500")}
                onClick={() => {
                  onPick(p)
                  setAdded((a) => [...a, p])
                }}
              >
                <Plus className="mt-0.5 size-4 shrink-0 self-start text-primary" />
                <span>{p}</span>
              </Button>
            </li>
          ))}
          {!phrases.length ? <li className="py-6 text-center text-sm text-muted-foreground">Nothing matches. Try another word.</li> : null}
        </ul>
        {lang === "en" && locale !== "en" ? (
          <p className="text-xs text-muted-foreground">Starters are in English for this language. Translate the sentence after you add it.</p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
