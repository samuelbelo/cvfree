"use client"

import { useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Info, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { completeness, reviewResume, type ReviewIssue } from "@/lib/resume/analysis"
import { cn } from "@/lib/utils"
import { useResume } from "@/store/editor-store"

type AiReview = {
  overall: string
  score: number
  strengths: string[]
  improvements: { area: string; suggestion: string }[]
}

const ICON = {
  high: <AlertCircle className="size-4 text-rose-500" />,
  medium: <Info className="size-4 text-amber-500" />,
  low: <Info className="size-4 text-sky-500" />,
}

export function ReviewPanel({ aiEnabled }: { aiEnabled: boolean }) {
  const resume = useResume()
  const issues = useMemo(() => reviewResume(resume), [resume])
  const { score } = useMemo(() => completeness(resume), [resume])
  const [ai, setAi] = useState<AiReview | null>(null)
  const [loading, setLoading] = useState(false)

  const runAi = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", resume }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAi(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI review failed")
    } finally {
      setLoading(false)
    }
  }

  const grouped = issues.reduce<Record<string, ReviewIssue[]>>((acc, i) => {
    ;(acc[i.area] ??= []).push(i)
    return acc
  }, {})

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Completeness" value={`${score}%`} tone={score >= 80 ? "good" : score >= 50 ? "ok" : "bad"} />
        <Stat
          label="Issues found"
          value={String(issues.length)}
          tone={issues.some((i) => i.severity === "high") ? "bad" : issues.length ? "ok" : "good"}
        />
      </div>

      <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <h3 className="font-semibold">Instant checks</h3>
        <p className="-mt-2 text-xs text-muted-foreground">Runs in your browser as you type. Nothing is sent anywhere.</p>
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" /> No problems found. Nice work.
          </div>
        ) : (
          Object.entries(grouped).map(([area, list]) => (
            <div key={area} className="grid gap-1.5">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{area}</div>
              {list.map((issue) => (
                <div key={issue.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5">{ICON[issue.severity]}</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </section>

      <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">AI review</h3>
            <p className="text-xs text-muted-foreground">
              {aiEnabled
                ? "Sends your resume to the AI provider configured on this server."
                : "Set AI_MODEL, AI_API_KEY and AI_BASE_URL to enable. Works with OpenAI, OpenRouter or a local Ollama."}
            </p>
          </div>
          <Button onClick={runAi} disabled={!aiEnabled || loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Get review
          </Button>
        </div>
        {ai ? (
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground">{ai.score}</span>
              <p>{ai.overall}</p>
            </div>
            {ai.strengths?.length ? (
              <div>
                <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Strengths</div>
                <ul className="list-disc space-y-1 pl-5">
                  {ai.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ai.improvements?.length ? (
              <div>
                <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Improve</div>
                <ul className="space-y-2">
                  {ai.improvements.map((s, i) => (
                    <li key={i} className="rounded-lg bg-muted/60 p-2">
                      <span className="font-medium">{s.area}: </span>
                      {s.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "good" | "ok" | "bad" }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "good" && "text-emerald-600",
          tone === "ok" && "text-amber-600",
          tone === "bad" && "text-rose-600"
        )}
      >
        {value}
      </div>
    </div>
  )
}
