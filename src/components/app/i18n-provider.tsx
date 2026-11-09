"use client"

import { createContext, useContext, useMemo } from "react"

import { translator, type Translate, type UiLocale } from "@/lib/ui/translate"

const I18nContext = createContext<{ locale: UiLocale; t: Translate }>({ locale: "en", t: translator("en") })

export function I18nProvider({ locale, children }: { locale: UiLocale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: translator(locale) }), [locale])
  return <I18nContext value={value}>{children}</I18nContext>
}

/** `t("Save")` gives the text in the language picked in Settings. */
export const useT = () => useContext(I18nContext).t

export const useUiLocale = () => useContext(I18nContext).locale
