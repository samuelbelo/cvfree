import type { Locale } from "./schema"

type Words = {
  present: string
  page: string
  of: string
  nationality: string
  placeOfBirth: string
  dateOfBirth: string
  drivingLicense: string
  address: string
  referencesOnRequest: string
  skillLevels: [string, string, string, string, string]
  languageLevels: [string, string, string, string, string]
  details: string
}

export const WORDS: Record<Locale, Words> = {
  en: {
    present: "Present",
    page: "Page",
    of: "of",
    nationality: "Nationality",
    placeOfBirth: "Place of birth",
    dateOfBirth: "Date of birth",
    drivingLicense: "Driving license",
    address: "Address",
    referencesOnRequest: "References available upon request",
    skillLevels: ["Novice", "Beginner", "Skillful", "Experienced", "Expert"],
    languageLevels: ["Basic", "Conversational", "Proficient", "Fluent", "Native"],
    details: "Details",
  },
  pt: {
    present: "Atual",
    page: "Página",
    of: "de",
    nationality: "Nacionalidade",
    placeOfBirth: "Local de nascimento",
    dateOfBirth: "Data de nascimento",
    drivingLicense: "Carta de condução",
    address: "Morada",
    referencesOnRequest: "Referências disponíveis mediante pedido",
    skillLevels: ["Iniciante", "Básico", "Competente", "Experiente", "Especialista"],
    languageLevels: ["Básico", "Conversação", "Proficiente", "Fluente", "Nativo"],
    details: "Detalhes",
  },
  es: {
    present: "Actualidad",
    page: "Página",
    of: "de",
    nationality: "Nacionalidad",
    placeOfBirth: "Lugar de nacimiento",
    dateOfBirth: "Fecha de nacimiento",
    drivingLicense: "Permiso de conducir",
    address: "Dirección",
    referencesOnRequest: "Referencias disponibles a petición",
    skillLevels: ["Novato", "Principiante", "Competente", "Experimentado", "Experto"],
    languageLevels: ["Básico", "Conversacional", "Competente", "Fluido", "Nativo"],
    details: "Datos",
  },
  fr: {
    present: "Aujourd'hui",
    page: "Page",
    of: "sur",
    nationality: "Nationalité",
    placeOfBirth: "Lieu de naissance",
    dateOfBirth: "Date de naissance",
    drivingLicense: "Permis de conduire",
    address: "Adresse",
    referencesOnRequest: "Références disponibles sur demande",
    skillLevels: ["Novice", "Débutant", "Compétent", "Expérimenté", "Expert"],
    languageLevels: ["Notions", "Conversation", "Courant", "Bilingue", "Langue maternelle"],
    details: "Coordonnées",
  },
  de: {
    present: "Heute",
    page: "Seite",
    of: "von",
    nationality: "Nationalität",
    placeOfBirth: "Geburtsort",
    dateOfBirth: "Geburtsdatum",
    drivingLicense: "Führerschein",
    address: "Adresse",
    referencesOnRequest: "Referenzen auf Anfrage",
    skillLevels: ["Anfänger", "Grundkenntnisse", "Gut", "Sehr gut", "Experte"],
    languageLevels: ["Grundkenntnisse", "Konversation", "Gut", "Fließend", "Muttersprache"],
    details: "Kontakt",
  },
}

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
}
