"use client"

import { useMemo, useState } from "react"
import { Check } from "lucide-react"

import { useT } from "@/components/app/i18n-provider"
import { ColorPicker } from "@/components/reui/color-picker"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DATE_FORMATS, FONT_IDS, type FontId, type Resume, type ResumeSettings } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { updateResume, useResume } from "@/store/editor-store"
import { FONTS } from "@/templates/font-list"
import { COLOR_SWATCHES, TEMPLATE_FILTERS, TEMPLATES, type TemplateTag } from "@/templates/registry"

import { ChoiceGroup, SelectField, SliderField } from "./fields"
import { TemplateThumb } from "./template-thumb"

const setSettings = (recipe: (s: ResumeSettings) => void) => updateResume((d) => recipe(d.settings))

export function CustomizePanel() {
  const t = useT()
  return (
    <Tabs defaultValue="template" className="gap-4">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b">
        <TabsTrigger value="template">{t("Template & Colors")}</TabsTrigger>
        <TabsTrigger value="text">{t("Text")}</TabsTrigger>
        <TabsTrigger value="layout">{t("Layout")}</TabsTrigger>
      </TabsList>
      <TabsContent value="template">
        <TemplateTab />
      </TabsContent>
      <TabsContent value="text">
        <TextTab />
      </TabsContent>
      <TabsContent value="layout">
        <LayoutTab />
      </TabsContent>
    </Tabs>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */

function TemplateTab() {
  const t = useT()
  const resume = useResume()
  const [filter, setFilter] = useState<"all" | TemplateTag>("all")
  const list = TEMPLATES.filter((t) => filter === "all" || t.tags.includes(filter))
  const color = resume.settings.color

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-xs">
        <span className="mr-1 text-sm text-muted-foreground">{t("Main color")}</span>
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={t("Use color {color}", { color: c })}
            onClick={() => setSettings((s) => void (s.color = c))}
            className={cn("grid size-7 place-items-center rounded-full ring-offset-2 transition", color.toLowerCase() === c && "ring-2 ring-foreground/70")}
            style={{ background: c }}
          >
            {color.toLowerCase() === c ? <Check className="size-3.5 text-white" /> : null}
          </button>
        ))}
        <ColorPicker
          value={color}
          onValueChange={(v) => v && setSettings((s) => void (s.color = v))}
          aria-label={t("Custom color")}
          className="ml-1"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted",
              filter === f.id && "border-primary bg-primary/5 text-primary"
            )}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {list.map((t) => (
          <TemplateCard key={t.id} resume={resume} id={t.id} />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({ resume, id }: { resume: Resume; id: string }) {
  const t = useT()
  const meta = TEMPLATES.find((entry) => entry.id === id)!
  const active = resume.settings.template === id
  // Show the user's own content in every thumbnail.
  const preview = useMemo(
    () => ({ ...resume, settings: { ...resume.settings, ...meta.defaults, template: id } }),
    // Thumbnails only need to refresh when content or color changes, not on every setting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resume.personal, resume.sections, resume.settings.color, resume.locale, id]
  )
  return (
    <button
      type="button"
      onClick={() =>
        setSettings((s) => {
          Object.assign(s, meta.defaults)
          s.template = id
        })
      }
      className="group grid gap-2 text-left"
    >
      <div className="text-center text-sm font-medium">{meta.name}</div>
      <div
        className={cn(
          "relative overflow-hidden rounded-md border shadow-sm transition group-hover:shadow-md",
          active && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <TemplateThumb resume={preview} />
        {active ? (
          <div className="absolute inset-0 grid place-items-center bg-primary/10">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow">
              <Check />
            </span>
          </div>
        ) : null}
        <div className="absolute right-1.5 bottom-1.5 flex gap-1">
          <Badge className="h-4 rounded-sm px-1 text-[9px]">PDF</Badge>
          {meta.tags.includes("docx") ? <Badge className="h-4 rounded-sm px-1 text-[9px]">DOCX</Badge> : null}
          {meta.tags.includes("ats") ? (
            <Badge variant="secondary" className="h-4 rounded-sm px-1 text-[9px]">
              ATS
            </Badge>
          ) : null}
        </div>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{t(meta.description)}</p>
    </button>
  )
}

/* ------------------------------------------------------------------ */

const FONT_OPTIONS = FONT_IDS.map((id) => ({ value: id, label: `${FONTS[id].label}${FONTS[id].serif ? " (serif)" : ""}` }))
const WEIGHTS = [300, 400, 500, 600, 700, 800].map((w) => ({
  value: String(w),
  label: { 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra bold" }[w]!,
}))

function TextTab() {
  const t = useT()
  const { settings: s } = useResume()
  const weights = WEIGHTS.map((w) => ({ ...w, label: t(w.label) }))
  return (
    <div className="grid gap-4">
      <Group title={t("Fonts")}>
        <div className="grid grid-cols-2 gap-3">
          <SelectField<FontId>
            label={t("Headings")}
            value={s.fonts.heading}
            options={FONT_OPTIONS}
            onChange={(v) => setSettings((x) => void (x.fonts.heading = v))}
          />
          <SelectField<FontId>
            label={t("Body")}
            value={s.fonts.body}
            options={FONT_OPTIONS}
            onChange={(v) => setSettings((x) => void (x.fonts.body = v))}
          />
        </div>
        <SliderField
          label={t("Line height")}
          min={1}
          max={2}
          step={0.05}
          value={s.lineHeight}
          format={(n) => `${Math.round(n * 100)}%`}
          onChange={(v) => setSettings((x) => void (x.lineHeight = v))}
        />
      </Group>
      <Group title={t("Font size")}>
        <SliderField label={t("Name")} min={14} max={40} step={0.5} unit=" pt" value={s.fontSize.name} onChange={(v) => setSettings((x) => void (x.fontSize.name = v))} />
        <SliderField label={t("Section titles")} min={8} max={20} step={0.5} unit=" pt" value={s.fontSize.section} onChange={(v) => setSettings((x) => void (x.fontSize.section = v))} />
        <SliderField label={t("Entry titles")} min={8} max={16} step={0.5} unit=" pt" value={s.fontSize.heading} onChange={(v) => setSettings((x) => void (x.fontSize.heading = v))} />
        <SliderField label={t("Body")} min={7} max={14} step={0.5} unit=" pt" value={s.fontSize.body} onChange={(v) => setSettings((x) => void (x.fontSize.body = v))} />
      </Group>
      <Group title={t("Font weight")}>
        <div className="grid grid-cols-3 gap-3">
          <SelectField label={t("Name")} value={String(s.fontWeight.name)} options={weights} onChange={(v) => setSettings((x) => void (x.fontWeight.name = Number(v)))} />
          <SelectField label={t("Section titles")} value={String(s.fontWeight.section)} options={weights} onChange={(v) => setSettings((x) => void (x.fontWeight.section = Number(v)))} />
          <SelectField label={t("Entry titles")} value={String(s.fontWeight.heading)} options={weights} onChange={(v) => setSettings((x) => void (x.fontWeight.heading = Number(v)))} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={s.uppercaseTitles} onCheckedChange={(v) => setSettings((x) => void (x.uppercaseTitles = v))} />
          {t("Uppercase section titles")}
        </label>
      </Group>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Bars({ widths, align = "left" }: { widths: number[]; align?: "left" | "center" | "right" }) {
  return (
    <div className={cn("grid gap-1", align === "center" && "justify-items-center", align === "right" && "justify-items-end")}>
      {widths.map((w, i) => (
        <span key={i} className="h-1.5 rounded-full bg-primary/25" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

function LayoutTab() {
  const t = useT()
  const { settings: s } = useResume()
  return (
    <div className="grid gap-4">
      <Group title={t("Page")}>
        <SelectField
          label={t("Format")}
          value={s.page.format}
          options={[
            { value: "A4", label: "A4 (210 × 297 mm)" },
            { value: "Letter", label: t("US Letter (8.5 × 11 in)") },
          ]}
          onChange={(v) => setSettings((x) => void (x.page.format = v))}
        />
        <SliderField label={t("Top & bottom")} min={5} max={30} step={0.5} unit=" mm" value={s.page.marginY} onChange={(v) => setSettings((x) => void (x.page.marginY = v))} />
        <SliderField label={t("Left & right")} min={5} max={30} step={0.5} unit=" mm" value={s.page.marginX} onChange={(v) => setSettings((x) => void (x.page.marginX = v))} />
      </Group>

      <Group title={t("Spacing")}>
        <SliderField label={t("Between sections")} min={0} max={30} step={0.5} unit=" pt" value={s.spacing.section} onChange={(v) => setSettings((x) => void (x.spacing.section = v))} />
        <SliderField label={t("Title to content")} min={0} max={16} step={0.5} unit=" pt" value={s.spacing.title} onChange={(v) => setSettings((x) => void (x.spacing.title = v))} />
        <SliderField label={t("Between entries")} min={0} max={20} step={0.5} unit=" pt" value={s.spacing.block} onChange={(v) => setSettings((x) => void (x.spacing.block = v))} />
        <SliderField label={t("Inside an entry")} min={0} max={10} step={0.5} unit=" pt" value={s.spacing.inside} onChange={(v) => setSettings((x) => void (x.spacing.inside = v))} />
      </Group>

      <Group title={t("Header alignment")}>
        <ChoiceGroup
          value={s.headerAlign}
          onChange={(v) => setSettings((x) => void (x.headerAlign = v))}
          options={(["left", "center", "right"] as const).map((a) => ({
            value: a,
            label: t(a === "left" ? "Left" : a === "center" ? "Center" : "Right"),
            preview: <Bars widths={[60, 35]} align={a} />,
          }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={s.contactIcons} onCheckedChange={(v) => setSettings((x) => void (x.contactIcons = v))} />
          {t("Icons next to contact details")}
        </label>
      </Group>

      <Group title={t("Dates")}>
        <SelectField
          label={t("Date format")}
          value={s.dateFormat}
          options={DATE_FORMATS.map((f) => ({
            value: f,
            label: { "MMM YYYY": t("Short month (Jan 2024)"), "MMMM YYYY": t("Full month (January 2024)"), "MM/YYYY": t("Numeric (01/2024)"), YYYY: t("Year only (2024)") }[f],
          }))}
          onChange={(v) => setSettings((x) => void (x.dateFormat = v))}
        />
        <ChoiceGroup
          value={s.dateAlign}
          onChange={(v) => setSettings((x) => void (x.dateAlign = v))}
          options={[
            { value: "inline", label: t("Under the title") },
            { value: "right", label: t("Right aligned") },
          ]}
        />
      </Group>

      <Group title={t("Skills")}>
        <ChoiceGroup
          value={s.skillsLayout}
          onChange={(v) => setSettings((x) => void (x.skillsLayout = v))}
          options={[
            { value: "inline", label: t("Inline") },
            { value: "columns", label: t("Columns") },
            { value: "bars", label: t("Bars") },
          ]}
        />
        {s.skillsLayout === "columns" ? (
          <>
            <SliderField label={t("Columns")} min={1} max={4} value={s.skillsColumns} onChange={(v) => setSettings((x) => void (x.skillsColumns = v))} />
            <p className="text-xs text-muted-foreground">{t("Skills placed in a narrow side column always use one column.")}</p>
          </>
        ) : null}
        {s.skillsLayout !== "bars" ? (
          <>
            <div className="text-xs text-muted-foreground">{t("Skill level")}</div>
            <ChoiceGroup
              value={s.skillLevelStyle}
              onChange={(v) => setSettings((x) => void (x.skillLevelStyle = v))}
              options={[
                { value: "dots", label: t("Dots") },
                { value: "text", label: t("Text") },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              {t("Dots are only visual. Text (“Expert”) is what a recruiter's software reads when it parses the PDF.")}
            </p>
          </>
        ) : null}
        {s.skillsLayout === "inline" ? (
          <SelectField
            label={t("Divider")}
            value={s.skillsDivider}
            options={[
              { value: "•", label: t("Bullet •") },
              { value: "|", label: t("Bar |") },
              { value: ",", label: t("Comma ,") },
              { value: "/", label: t("Slash /") },
            ]}
            onChange={(v) => setSettings((x) => void (x.skillsDivider = v))}
          />
        ) : null}
      </Group>

      <Group title={t("Education")}>
        <ChoiceGroup
          value={s.educationFirst}
          onChange={(v) => setSettings((x) => void (x.educationFirst = v))}
          options={[
            { value: "degree", label: t("Degree first") },
            { value: "institution", label: t("School first") },
          ]}
        />
      </Group>

      <Group title={t("Photo")}>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={s.photo.show} onCheckedChange={(v) => setSettings((x) => void (x.photo.show = v))} />
          {t("Show photo (when the template supports it)")}
        </label>
        <ChoiceGroup
          value={s.photo.shape}
          onChange={(v) => setSettings((x) => void (x.photo.shape = v))}
          options={[
            { value: "circle", label: t("Circle") },
            { value: "rounded", label: t("Rounded") },
            { value: "square", label: t("Square") },
          ]}
        />
        <SliderField label={t("Size")} min={15} max={45} step={1} unit=" mm" value={s.photo.size} onChange={(v) => setSettings((x) => void (x.photo.size = v))} />
      </Group>
    </div>
  )
}
