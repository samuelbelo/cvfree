import { PT_BR } from "./pt-BR"

/** Languages the app itself can be shown in. The language of a resume is a separate choice. */
export const UI_LOCALES = ["en", "pt-BR"] as const
export type UiLocale = (typeof UI_LOCALES)[number]

export const UI_LOCALE_NAMES: Record<UiLocale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
}

export type Vars = Record<string, string | number>
export type Translate = (text: string, vars?: Vars) => string

const DICTIONARIES: Record<UiLocale, Record<string, string>> = {
  en: {},
  "pt-BR": PT_BR,
}

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text

/**
 * The English text is the key, so a component reads the same with or without a translation.
 * A text that has no entry yet shows in English.
 */
export function translator(locale: UiLocale): Translate {
  const dictionary = DICTIONARIES[locale]
  return (text, vars) => fill(dictionary[text] ?? text, vars)
}
