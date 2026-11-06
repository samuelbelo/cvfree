import "server-only"

import { fullName, htmlToText } from "@/lib/resume/format"
import { collectText } from "@/lib/resume/analysis"
import type { Letter } from "@/lib/letter/schema"
import type { Resume } from "@/lib/resume/schema"

import { aiEnabled, config } from "./config"

/*
 * Optional AI helpers. Any OpenAI-compatible endpoint works: OpenAI,
 * OpenRouter, Groq, a local Ollama or LM Studio. Set AI_BASE_URL, AI_API_KEY
 * and AI_MODEL. Without them the app runs fully offline.
 */

async function chat(system: string, user: string): Promise<string> {
  if (!aiEnabled()) throw new Error("AI is not configured. Set AI_MODEL (and AI_API_KEY / AI_BASE_URL).")
  const res = await fetch(`${config.ai.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.ai.apiKey ? { Authorization: `Bearer ${config.ai.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.ai.model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? "{}"
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

function resumeForPrompt(resume: Resume) {
  const summary = resume.sections.find((s) => s.type === "summary")
  return [
    `Name: ${fullName(resume)}`,
    `Target title: ${resume.personal.jobTitle}`,
    `Summary: ${summary?.kind === "text" ? htmlToText(summary.html) : ""}`,
    "Full content:",
    collectText(resume),
  ].join("\n")
}

export type AiReview = {
  overall: string
  score: number
  strengths: string[]
  improvements: { area: string; suggestion: string }[]
}

export async function aiReview(resume: Resume): Promise<AiReview> {
  const raw = await chat(
    "You are a senior recruiter reviewing a resume. Be concrete and short. Reply in the language of the resume. " +
      'Return JSON: {"overall": string, "score": number 0-100, "strengths": string[], "improvements": [{"area": string, "suggestion": string}]}. ' +
      "Give at most 8 improvements, each one actionable.",
    resumeForPrompt(resume)
  )
  return parseJson<AiReview>(raw, { overall: raw, score: 0, strengths: [], improvements: [] })
}

export type AiTailor = {
  summary: string
  keywords: string[]
  suggestions: string[]
}

export async function aiTailor(resume: Resume, jobDescription: string): Promise<AiTailor> {
  const raw = await chat(
    "You tailor resumes to job postings without inventing experience. Reply in the language of the resume. " +
      'Return JSON: {"summary": string (a rewritten professional summary, 400-600 characters, plain text), ' +
      '"keywords": string[] (skills from the posting the candidate plausibly has but does not mention), ' +
      '"suggestions": string[] (up to 6 concrete edits to bullets or sections)}.',
    `JOB POSTING:\n${jobDescription.slice(0, 12_000)}\n\nRESUME:\n${resumeForPrompt(resume)}`
  )
  return parseJson<AiTailor>(raw, { summary: "", keywords: [], suggestions: [raw] })
}

export type AiLetter = { paragraphs: string[] }

/**
 * Drafts the body of a cover letter from the resume and the posting. Plain
 * paragraphs, no greeting or sign-off: the letter adds those itself.
 */
export async function aiLetter(letter: Letter, resume: Resume | null, jobDescription: string): Promise<AiLetter> {
  const target = [
    letter.recipient.company ? `Company: ${letter.recipient.company}` : "",
    letter.recipient.position ? `Position: ${letter.recipient.position}` : "",
    letter.recipient.name ? `Addressed to: ${letter.recipient.name}` : "",
  ]
    .filter(Boolean)
    .join("\n")
  const raw = await chat(
    "You write cover letters that sound like the candidate, not like a template. Use only facts from the resume, never invent employers, " +
      "titles, dates or numbers. Three or four short paragraphs: why this role and company, what the candidate brings with one concrete result, " +
      "and a short close that asks for a conversation. No greeting, no sign-off, no placeholders in brackets. " +
      `Write in the language code "${letter.locale}". Return JSON: {"paragraphs": string[]}.`,
    `${target}

JOB POSTING:
${jobDescription.slice(0, 12_000)}

RESUME:
${resume ? resumeForPrompt(resume) : "Sender: " + letter.sender.name + ", " + letter.sender.jobTitle}`
  )
  return parseJson<AiLetter>(raw, { paragraphs: [raw] })
}
