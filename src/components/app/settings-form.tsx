"use client"

import { useState } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { SelectField } from "@/components/editor/fields"
import { Button } from "@/components/ui/button"
import { LOCALE_NAMES } from "@/lib/resume/i18n"
import { LOCALES, type Locale } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { COLOR_SWATCHES, TEMPLATES } from "@/templates/registry"

type AppSettings = { defaultTemplate: string; defaultColor: string; defaultLocale: Locale; ownerName: string }

export function SettingsForm({ initial }: { initial: AppSettings }) {
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
    if (res.ok) toast.success("Settings saved")
    else toast.error("Could not save settings")
  }

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs">
      <h2 className="font-semibold">New resume defaults</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Template"
          value={value.defaultTemplate}
          options={TEMPLATES.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(v) => setValue({ ...value, defaultTemplate: v })}
        />
        <SelectField<Locale>
          label="Resume language"
          value={value.defaultLocale}
          options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
          onChange={(v) => setValue({ ...value, defaultLocale: v })}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs text-muted-foreground">Color</span>
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
        {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
      </Button>
    </section>
  )
}
