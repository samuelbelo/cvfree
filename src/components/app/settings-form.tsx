"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { useT } from "@/components/app/i18n-provider"
import { SelectField } from "@/components/editor/fields"
import { Button } from "@/components/ui/button"
import { LOCALE_NAMES } from "@/lib/resume/i18n"
import { LOCALES, type Locale } from "@/lib/resume/schema"
import { translator, UI_LOCALE_NAMES, UI_LOCALES, type UiLocale } from "@/lib/ui/translate"
import { cn } from "@/lib/utils"
import { COLOR_SWATCHES, TEMPLATES } from "@/templates/registry"

type AppSettings = { defaultTemplate: string; defaultColor: string; defaultLocale: Locale; ownerName: string; uiLocale: UiLocale }

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const t = useT()
  const router = useRouter()
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    })
    setSaving(false)
    if (!res.ok) return void toast.error(t("Could not save settings"))
    // The confirmation already speaks the language that was just picked, and the refresh brings the rest of the page along.
    toast.success(translator(value.uiLocale)("Settings saved"))
    router.refresh()
  }

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs">
      <h2 className="font-semibold">{t("Preferences")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField<UiLocale>
          label={t("Interface language")}
          value={value.uiLocale}
          options={UI_LOCALES.map((l) => ({ value: l, label: UI_LOCALE_NAMES[l] }))}
          onChange={(v) => setValue({ ...value, uiLocale: v })}
        />
      </div>
      <h3 className="mt-1 text-sm font-medium">{t("New resume defaults")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t("Template")}
          value={value.defaultTemplate}
          options={TEMPLATES.map((tpl) => ({ value: tpl.id, label: tpl.name }))}
          onChange={(v) => setValue({ ...value, defaultTemplate: v })}
        />
        <SelectField<Locale>
          label={t("Resume language")}
          value={value.defaultLocale}
          options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
          onChange={(v) => setValue({ ...value, defaultLocale: v })}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs text-muted-foreground">{t("Color")}</span>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setValue({ ...value, defaultColor: c })}
              className={cn("size-7 rounded-full ring-offset-2", value.defaultColor === c && "ring-2 ring-foreground/70")}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <Button className="w-fit" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />} {t("Save")}
      </Button>
    </section>
  )
}
