"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Link2, Loader2, Plus, Sparkles, Wand2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { matchKeywords } from "@/lib/resume/analysis"
import { createSection, createSkillItem } from "@/lib/resume/defaults"
import { updateResume, useEditor, useResume } from "@/store/editor-store"

type AiTailor = { summary: string; keywords: string[]; suggestions: string[] }

export function TailorPanel({ aiEnabled, onBeforeLeave }: { aiEnabled: boolean; onBeforeLeave: () => Promise<void> }) {
  const resume = useResume()
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [jd, setJd] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [fetching, setFetching] = useState(false)
  const [ai, setAi] = useState<AiTailor | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const report = useMemo(() => (jd.trim().length > 80 ? matchKeywords(resume, jd) : null), [resume, jd])

  const fetchUrl = async () => {
    setFetching(true)
    try {
      const res = await fetch("/api/job-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJd(data.text)
      setJobTitle(data.title)
      toast.success("Job description loaded. Trim anything that is not the posting.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the page. Paste the text instead.")
    } finally {
      setFetching(false)
    }
  }

  // A keyword from the posting is a question, not a fact. The dialog asks
  // where the person used it before anything lands in the resume.
  const [pick, setPick] = useState<string | null>(null)
  const [evidence, setEvidence] = useState("")
  const currentJob = useMemo(() => {
    const exp = resume.sections.find((s) => s.type === "experience")
    const item = exp?.kind === "timeline" ? exp.items.find((i) => i.title.trim() || i.subtitle.trim()) : undefined
    return item ? { id: item.id, label: [item.title, item.subtitle].filter(Boolean).join(" at ") } : null
  }, [resume.sections])

  const addSkill = (name: string) =>
    updateResume((d) => {
      let skills = d.sections.find((s) => s.type === "skills")
      if (!skills) {
        skills = createSection("skills")
        d.sections.push(skills)
      }
      if (skills.kind === "skills") skills.items.push(createSkillItem({ name: name.replace(/\b\w/g, (c) => c.toUpperCase()), level: 0 }))
    })

  const addBullet = (text: string) =>
    updateResume((d) => {
      const exp = d.sections.find((s) => s.type === "experience")
      if (exp?.kind !== "timeline" || !currentJob) return
      const item = exp.items.find((i) => i.id === currentJob.id)
      if (!item) return
      const li = `<li><p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p></li>`
      item.description = /<\/ul>\s*$/.test(item.description) ? item.description.replace(/<\/ul>\s*$/, `${li}</ul>`) : `${item.description}<ul>${li}</ul>`
    })

  const closePick = () => {
    setPick(null)
    setEvidence("")
  }

  const runAi = async () => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tailor", resume, jobDescription: jd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAi(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI tailoring failed")
    } finally {
      setAiLoading(false)
    }
  }

  const applySummary = (text: string) =>
    updateResume((d) => {
      let summary = d.sections.find((s) => s.type === "summary")
      if (!summary) {
        summary = createSection("summary")
        d.sections.unshift(summary)
      }
      if (summary.kind === "text") summary.html = `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`
    })

  const saveCopy = async () => {
    await onBeforeLeave()
    const title = jobTitle.trim() ? `${resume.title} for ${jobTitle.trim().slice(0, 60)}` : `${resume.title} (tailored)`
    const res = await fetch(`/api/resumes/${resume.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) return toast.error("Could not create the copy")
    const copy = await res.json()
    toast.success("Tailored copy created")
    useEditor.setState({ resume: null })
    router.push(`/resumes/${copy.id}`)
  }

  return (
    <div className="grid gap-4">
      <Dialog open={pick !== null} onOpenChange={(open) => !open && closePick()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add &ldquo;{pick}&rdquo;?</DialogTitle>
            <DialogDescription>
              The posting mentions it. Only add it if you really have it. A sentence about where you used it, with a result, says more than a word
              in a list.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder={currentJob ? `Where did you use ${pick}? For example: "Moved the deploys to ${pick}, cutting release time from a day to an hour."` : "Add a job under Experience first to write where you used it."}
            disabled={!currentJob}
            className="min-h-24 text-sm"
            aria-label="Where you used it"
          />
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={closePick}>
              Not really, skip
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (pick) addSkill(pick)
                  closePick()
                }}
              >
                Skills list only
              </Button>
              <Button
                disabled={!currentJob || evidence.trim().length < 15}
                onClick={() => {
                  if (pick) {
                    addSkill(pick)
                    addBullet(evidence.trim())
                  }
                  closePick()
                }}
              >
                Add bullet to {currentJob ? currentJob.label.split(" at ")[0] : "job"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <h3 className="font-semibold">Got a posting? Paste the link or the description</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://company.com/jobs/123" className="h-10 pl-9" />
          </div>
          <Button className="h-10" onClick={fetchUrl} disabled={!url || fetching}>
            {fetching ? <Loader2 className="animate-spin" /> : null} Load
          </Button>
        </div>
        <Textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Or paste the job description here..."
          className="min-h-40 text-sm"
        />
      </section>

      {report ? (
        <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Keyword coverage</h3>
              <p className="text-xs text-muted-foreground">
                Share of the posting&apos;s terms that appear somewhere in your resume. A word count, not an ATS score or a hiring prediction.
              </p>
            </div>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: report.score >= 60 ? "#059669" : report.score >= 35 ? "#d97706" : "#e11d48" }}>
              {report.score}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${report.score}%` }} />
          </div>
          {report.missing.length ? (
            <div className="grid gap-1.5">
              <div className="text-xs text-muted-foreground">
                Not found in your resume. Click one to add it as a skill, only if you really have it. Better still, mention it where you used it.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.missing.map((k) => (
                  <button key={k} type="button" onClick={() => setPick(k)}>
                    <Badge variant="outline" className="cursor-pointer gap-1 hover:bg-muted">
                      <Plus className="size-3" /> {k}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {report.matched.length ? (
            <div className="grid gap-1.5">
              <div className="text-xs text-muted-foreground">Already covered:</div>
              <div className="flex flex-wrap gap-1.5">
                {report.matched.map((k) => (
                  <Badge key={k} variant="secondary">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Company or role, for the copy's name" className="h-9 flex-1" />
            <Button variant="outline" onClick={saveCopy}>
              <Copy /> Save as tailored copy
            </Button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Tailor with AI</h3>
            <p className="text-xs text-muted-foreground">
              {aiEnabled ? "Rewrites your summary and suggests edits for this job." : "Configure an AI provider on the server to enable this."}
            </p>
          </div>
          <Button onClick={runAi} disabled={!aiEnabled || aiLoading || jd.trim().length < 80}>
            {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles />} Tailor
          </Button>
        </div>
        {ai ? (
          <div className="grid gap-3 text-sm">
            {ai.summary ? (
              <div className="grid gap-2 rounded-lg bg-muted/60 p-3">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Suggested summary</div>
                <p>{ai.summary}</p>
                <Button size="sm" variant="outline" className="w-fit" onClick={() => applySummary(ai.summary)}>
                  <Wand2 /> Use this summary
                </Button>
              </div>
            ) : null}
            {ai.keywords?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {ai.keywords.map((k) => (
                  <button key={k} type="button" onClick={() => addSkill(k)}>
                    <Badge variant="outline" className="cursor-pointer gap-1 hover:bg-muted">
                      <Plus className="size-3" /> {k}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : null}
            {ai.suggestions?.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {ai.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
