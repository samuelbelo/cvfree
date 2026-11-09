import { fullName, htmlToText, isHtmlEmpty } from "./format"
import type { Resume, Section } from "./schema"

/*
 * Offline checks. No AI needed: completeness score, writing hints and a
 * keyword match against a job description.
 */

const find = (resume: Resume, type: string) => resume.sections.find((s) => s.type === type && !s.hidden)

export function completeness(resume: Resume): { score: number; missing: string[] } {
  const p = resume.personal
  const checks: [boolean, number, string][] = [
    [Boolean(fullName(resume)), 8, "Add your name"],
    [Boolean(p.jobTitle), 7, "Add a job title"],
    [Boolean(p.email), 7, "Add an email"],
    [Boolean(p.phone), 6, "Add a phone number"],
    [Boolean(p.city || p.country), 4, "Add your city or country"],
    [summaryLength(resume) >= 200, 15, "Write a summary of at least 200 characters"],
    [timelineCount(find(resume, "experience")) >= 1, 15, "Add at least one job"],
    [describedJobs(resume) >= 1, 10, "Describe what you did in your jobs"],
    [timelineCount(find(resume, "education")) >= 1, 10, "Add your education"],
    [skillCount(find(resume, "skills")) >= 5, 10, "List at least 5 skills"],
    [skillCount(find(resume, "languages")) >= 1, 4, "Add the languages you speak"],
    [linkCount(resume) >= 1, 4, "Add a link (LinkedIn, GitHub, portfolio)"],
  ]
  const score = checks.reduce((acc, [ok, weight]) => acc + (ok ? weight : 0), 0)
  return { score: Math.min(100, score), missing: checks.filter(([ok]) => !ok).map(([, , msg]) => msg) }
}

function summaryLength(resume: Resume) {
  const s = find(resume, "summary")
  return s?.kind === "text" ? htmlToText(s.html).length : 0
}

function timelineCount(section?: Section) {
  return section?.kind === "timeline" ? section.items.filter((i) => i.title.trim() || i.subtitle.trim()).length : 0
}

function skillCount(section?: Section) {
  return section?.kind === "skills" ? section.items.filter((i) => i.name.trim()).length : 0
}

function linkCount(resume: Resume) {
  const links = find(resume, "links")
  const n = links?.kind === "links" ? links.items.filter((i) => i.url.trim()).length : 0
  return n + (resume.personal.linkedin ? 1 : 0) + (resume.personal.website ? 1 : 0)
}

function describedJobs(resume: Resume) {
  const exp = find(resume, "experience")
  return exp?.kind === "timeline" ? exp.items.filter((i) => !isHtmlEmpty(i.description)).length : 0
}

export type ReviewIssue = {
  id: string
  severity: "high" | "medium" | "low"
  area: string
  message: string
}

const WEAK_PHRASES = [
  "responsible for",
  "worked on",
  "helped with",
  "duties included",
  "various tasks",
  "team player",
  "hard worker",
  "detail oriented",
  "detail-oriented",
]

export function reviewResume(resume: Resume): ReviewIssue[] {
  const issues: ReviewIssue[] = []
  const add = (severity: ReviewIssue["severity"], area: string, message: string) =>
    issues.push({ id: `${area}-${issues.length}`, severity, area, message })
  const p = resume.personal

  if (!p.email) add("high", "Contact", "Recruiters need an email address to reach you.")
  if (!p.phone) add("medium", "Contact", "Add a phone number. Many recruiters call first.")
  if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) add("high", "Contact", "The email address looks invalid.")
  if (!p.jobTitle) add("medium", "Header", "Add a target job title under your name.")

  const summary = summaryLength(resume)
  if (summary === 0) add("high", "Summary", "Write a short professional summary.")
  // Same thresholds as the completeness score: 200 is the floor, 600 a comfortable ceiling.
  else if (summary < 200) add("medium", "Summary", `Your summary has ${summary} characters. Two to four sentences, 200 to 600 characters, read well.`)
  else if (summary > 750) add("low", "Summary", `Your summary has ${summary} characters. Trimming it to about 600 keeps it scannable.`)

  const exp = find(resume, "experience")
  if (exp?.kind === "timeline") {
    if (!exp.items.length) add("high", "Experience", "Add your work experience, most recent first.")
    exp.items.forEach((item) => {
      const label = item.title || item.subtitle || "A job"
      const text = htmlToText(item.description)
      if (!item.startDate) add("medium", "Experience", `${label}: add a start date.`)
      if (!item.endDate && !item.current && item.startDate) add("low", "Experience", `${label}: add an end date or mark it as current.`)
      if (!text) add("high", "Experience", `${label}: describe what you achieved.`)
      else {
        if (!/\d/.test(text)) add("medium", "Experience", `${label}: add numbers (%, money, time, users) to show impact.`)
        const bullets = (item.description.match(/<li/gi) ?? []).length
        if (bullets > 7) add("low", "Experience", `${label}: ${bullets} bullet points. Keep the 3 to 6 strongest.`)
        if (text.length > 1200) add("low", "Experience", `${label}: the description is long. Keep it scannable.`)
      }
      const start = item.startDate.slice(0, 7)
      const end = item.endDate.slice(0, 7)
      if (start && end && !item.current && end < start) add("high", "Experience", `${label}: the end date is before the start date.`)
    })
  } else {
    add("high", "Experience", "Add a Professional Experience section.")
  }

  const allText = collectText(resume).toLowerCase()
  const weak = WEAK_PHRASES.filter((w) => allText.includes(w))
  if (weak.length) add("medium", "Wording", `Swap passive phrases for action verbs: ${weak.map((w) => `"${w}"`).join(", ")}.`)
  const firstPerson = (allText.match(/\b(i|me|my)\b/g) ?? []).length
  if (firstPerson > 2) add("low", "Wording", "Avoid first person (I, me, my). Start bullets with a verb.")

  const skills = find(resume, "skills")
  const nSkills = skillCount(skills)
  if (nSkills === 0) add("high", "Skills", "List the skills the jobs you want ask for.")
  else if (nSkills > 20) add("low", "Skills", `${nSkills} skills is a lot. Keep the 10 to 15 most relevant.`)

  if (!find(resume, "education")) add("medium", "Education", "Add an Education section.")

  return issues.sort((a, b) => rank(a.severity) - rank(b.severity))
}

const rank = (s: ReviewIssue["severity"]) => (s === "high" ? 0 : s === "medium" ? 1 : 2)

export function collectText(resume: Resume): string {
  const parts: string[] = [resume.personal.jobTitle]
  for (const s of resume.sections) {
    if (s.hidden) continue
    switch (s.kind) {
      case "text":
        parts.push(htmlToText(s.html))
        break
      case "timeline":
        s.items.forEach((i) => parts.push(i.title, i.subtitle, htmlToText(i.description)))
        break
      case "skills":
        s.items.forEach((i) => parts.push(i.name, i.category))
        break
      case "links":
        s.items.forEach((i) => parts.push(i.label))
        break
      case "references":
        break
    }
  }
  return parts.filter(Boolean).join("\n")
}

/* ------------------------------------------------------------------ */
/* Job description keyword match                                       */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  (
    "a an and are as at be been being but by can could do does for from had has have having he her his how i if in into is it its " +
    "just may me more most must my no not of on or our ours out over own same she should so some such than that the their them then " +
    "there these they this those through to too under up very was we were what when where which while who whom why will with would " +
    "you your yours about above after again against all also am any because before below between both during each few further here " +
    "once only other ourselves itself themselves until ever etc per via within across along among around upon including include " +
    "work working team teams role job position candidate candidates company experience years year strong ability skills skill " +
    "knowledge understanding good great excellent plus preferred required requirements responsibilities requirement looking join " +
    "opportunity new using use used make help well like based level within ensure provide part environment people across best " +
    "o a os as de da do das dos e em no na nos nas um uma para por com sem que se ao à às pelo pela mais muito como ser ter seu sua são é " +
    "el la los las y en un una del al con por para es son lo le les des du et en au aux pour par sur avec dans der die das und mit von zu"
  ).split(/\s+/)
)

/** Extra filler that postings use a lot but that is never a skill. */
const FILLER = new Set(
  ("need needs want wants will would build builds building run runs running deliver delivering bring join looking seeking ideal great strong solid hands-on day days senior junior mid " +
    "maintain maintaining improve improving take taking look looks together other part clear written hybrid remote onsite office app apps " +
    // Portuguese
    "procuramos buscamos vaga vagas requisitos requisito obrigatório obrigatórios obrigatória desejável desejáveis diferencial diferenciais " +
    "experiência experiências equipe equipa trabalho trabalhar atividades atividade responsabilidades responsabilidade conhecimento conhecimentos " +
    "habilidades habilidade competências competência formação superior completo completa cursando anos ano sênior sénior pleno júnior " +
    "benefícios salário remoto híbrido presencial empresa empresas candidato candidata oportunidade perfil atuar atuação área áreas " +
    "disponibilidade horário contratação regime nível excelente boa bom sólida sólido forte fortes avançado avançada básico intermediário fluente " +
    // Spanish
    "buscamos requisitos imprescindible deseable experiencia equipo trabajo responsabilidades conocimientos habilidades formación años " +
    "beneficios salario remoto híbrido presencial empresa candidato oportunidad perfil nivel excelente " +
    // French
    "recherchons poste profil missions compétences expérience équipe travail formation années requis souhaité entreprise candidat télétravail " +
    // German
    "suchen stelle aufgaben anforderungen erfahrung kenntnisse team arbeit ausbildung jahre unternehmen bewerber wünschenswert").split(
    " "
  )
)

const TOKEN_RE = /[a-z0-9à-ÿ][a-z0-9à-ÿ+#.\-/]*[a-z0-9+#]|[a-z]/gi

function tokens(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []).map((t) => t.replace(/\.$/, ""))
}

/** Split into clauses so word pairs never jump across punctuation. */
function clauses(text: string): string[][] {
  return text
    .toLowerCase()
    .split(/[\n,;:!?()•|]+|\.(?=\s|$)|\s(?:and|or|e|ou|y|et|und)\s/)
    .map((c) => tokens(c))
    .filter((c) => c.length)
}

const isTerm = (t: string) => t.length >= 2 && !STOPWORDS.has(t) && !FILLER.has(t) && !/^\d+[+%]?$/.test(t)

export type KeywordReport = {
  score: number
  matched: string[]
  missing: string[]
}

/**
 * Pick the meaningful words of the posting (most repeated first, then in
 * reading order), plus word pairs that the posting repeats, then check which
 * of them the resume mentions.
 */
export function matchKeywords(resume: Resume, jobDescription: string, limit = 30): KeywordReport {
  const words = new Map<string, { n: number; first: number }>()
  const pairs = new Map<string, number>()
  let position = 0
  for (const clause of clauses(jobDescription)) {
    clause.forEach((t, i) => {
      if (!isTerm(t)) return
      const entry = words.get(t)
      if (entry) entry.n++
      else words.set(t, { n: 1, first: position++ })
      const next = clause[i + 1]
      if (next && isTerm(next)) pairs.set(`${t} ${next}`, (pairs.get(`${t} ${next}`) ?? 0) + 1)
    })
  }

  // Pairs count only when repeated, and then replace their single words.
  const repeatedPairs = [...pairs.entries()].filter(([, n]) => n >= 2).map(([k]) => k)
  const covered = new Set(repeatedPairs.flatMap((p) => p.split(" ")))
  const singles = [...words.entries()]
    .filter(([w]) => !covered.has(w))
    .sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first)
    .map(([w]) => w)
  const keywords = [...repeatedPairs, ...singles].slice(0, limit)

  const haystack = ` ${tokens(collectText(resume)).join(" ")} `
  const matched = keywords.filter((k) => haystack.includes(` ${k} `))
  const missing = keywords.filter((k) => !matched.includes(k))
  const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0
  return { score, matched, missing }
}
