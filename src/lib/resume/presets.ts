import type { Locale, SectionKind } from "./schema"

type Labels = Record<Locale, string>

export type SectionPreset = {
  type: string
  kind: SectionKind
  titles: Labels
  /** Where two-column templates place it when the section column is "auto". */
  column: "main" | "side"
  /** Only one instance makes sense (summary, skills...). */
  single: boolean
  /** Field labels used by the editor for timeline sections. */
  fields?: { title: string; subtitle: string; city?: string }
  /** Use language levels instead of skill levels. */
  languageLevels?: boolean
  description: string
}

const t = (en: string, pt: string, es: string, fr: string, de: string): Labels => ({
  en,
  pt,
  es,
  fr,
  de,
})

export const SECTION_PRESETS: SectionPreset[] = [
  {
    type: "summary",
    kind: "text",
    titles: t("Professional Summary", "Resumo Profissional", "Perfil Profesional", "Profil professionnel", "Profil"),
    column: "main",
    single: true,
    description: "Two to four sentences about who you are and what you do best.",
  },
  {
    type: "experience",
    kind: "timeline",
    titles: t("Professional Experience", "Experiência Profissional", "Experiencia Profesional", "Expérience professionnelle", "Berufserfahrung"),
    column: "main",
    single: true,
    fields: { title: "Job title", subtitle: "Employer", city: "City" },
    description: "Recent roles first. Lead with results, ideally with numbers.",
  },
  {
    type: "education",
    kind: "timeline",
    titles: t("Education", "Formação Académica", "Educación", "Formation", "Ausbildung"),
    column: "main",
    single: true,
    fields: { title: "Degree", subtitle: "School", city: "City" },
    description: "Degrees and schools, most recent first.",
  },
  {
    type: "skills",
    kind: "skills",
    titles: t("Skills", "Competências", "Habilidades", "Compétences", "Kenntnisse"),
    column: "side",
    single: false,
    description: "Pick the skills the job listing asks for.",
  },
  {
    type: "languages",
    kind: "skills",
    titles: t("Languages", "Idiomas", "Idiomas", "Langues", "Sprachen"),
    column: "side",
    single: true,
    languageLevels: true,
    description: "Languages you speak and how well.",
  },
  {
    type: "links",
    kind: "links",
    titles: t("Websites & Social Links", "Links", "Enlaces", "Liens", "Links"),
    column: "side",
    single: true,
    description: "Portfolio, GitHub, LinkedIn and other profiles.",
  },
  {
    type: "accomplishments",
    kind: "text",
    titles: t("Accomplishments", "Conquistas", "Logros", "Réalisations", "Erfolge"),
    column: "main",
    single: true,
    description: "Your best wins in a few bullet points.",
  },
  {
    type: "projects",
    kind: "timeline",
    titles: t("Projects", "Projetos", "Proyectos", "Projets", "Projekte"),
    column: "main",
    single: true,
    fields: { title: "Project", subtitle: "Role or company" },
    description: "Side projects, open source and notable work.",
  },
  {
    type: "certifications",
    kind: "timeline",
    titles: t("Certifications", "Certificações", "Certificaciones", "Certifications", "Zertifikate"),
    column: "main",
    single: true,
    fields: { title: "Certification", subtitle: "Issuer" },
    description: "Professional certificates and licenses.",
  },
  {
    type: "courses",
    kind: "timeline",
    titles: t("Courses", "Cursos", "Cursos", "Formations", "Kurse"),
    column: "main",
    single: true,
    fields: { title: "Course", subtitle: "Institution" },
    description: "Training and professional courses.",
  },
  {
    type: "internships",
    kind: "timeline",
    titles: t("Internships", "Estágios", "Prácticas", "Stages", "Praktika"),
    column: "main",
    single: true,
    fields: { title: "Job title", subtitle: "Employer", city: "City" },
    description: "Internships and apprenticeships.",
  },
  {
    type: "volunteering",
    kind: "timeline",
    titles: t("Volunteering", "Voluntariado", "Voluntariado", "Bénévolat", "Ehrenamt"),
    column: "main",
    single: true,
    fields: { title: "Role", subtitle: "Organization", city: "City" },
    description: "Volunteer work and community roles.",
  },
  {
    type: "extracurricular",
    kind: "timeline",
    titles: t("Extracurricular Activities", "Atividades Extracurriculares", "Actividades Extracurriculares", "Activités extrascolaires", "Außerschulische Aktivitäten"),
    column: "main",
    single: true,
    fields: { title: "Function", subtitle: "Organization", city: "City" },
    description: "Clubs, sports and student organizations.",
  },
  {
    type: "awards",
    kind: "timeline",
    titles: t("Awards", "Prémios", "Premios", "Distinctions", "Auszeichnungen"),
    column: "main",
    single: true,
    fields: { title: "Award", subtitle: "Awarded by" },
    description: "Prizes and recognition.",
  },
  {
    type: "publications",
    kind: "timeline",
    titles: t("Publications", "Publicações", "Publicaciones", "Publications", "Publikationen"),
    column: "main",
    single: true,
    fields: { title: "Title", subtitle: "Publisher" },
    description: "Papers, articles and talks.",
  },
  {
    type: "hobbies",
    kind: "text",
    titles: t("Hobbies", "Interesses", "Aficiones", "Centres d'intérêt", "Hobbys"),
    column: "side",
    single: true,
    description: "A short line about what you like doing.",
  },
  {
    type: "references",
    kind: "references",
    titles: t("References", "Referências", "Referencias", "Références", "Referenzen"),
    column: "main",
    single: true,
    description: "People who can vouch for your work.",
  },
  {
    type: "customText",
    kind: "text",
    titles: t("Custom Section", "Secção Personalizada", "Sección Personalizada", "Section personnalisée", "Eigener Abschnitt"),
    column: "main",
    single: false,
    description: "Free text with your own title.",
  },
  {
    type: "customTimeline",
    kind: "timeline",
    titles: t("Custom Section", "Secção Personalizada", "Sección Personalizada", "Section personnalisée", "Eigener Abschnitt"),
    column: "main",
    single: false,
    fields: { title: "Title", subtitle: "Subtitle", city: "City" },
    description: "Entries with dates and descriptions.",
  },
  {
    type: "customSkills",
    kind: "skills",
    titles: t("Expertise", "Especialidades", "Especialidades", "Expertise", "Expertise"),
    column: "side",
    single: false,
    description: "A second list of skills, tools or strengths.",
  },
]

const BY_TYPE = new Map(SECTION_PRESETS.map((p) => [p.type, p]))

export function getPreset(type: string): SectionPreset {
  return BY_TYPE.get(type) ?? BY_TYPE.get("customText")!
}
