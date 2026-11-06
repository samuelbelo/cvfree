"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react"

import { Sortable, SortableItem, SortableItemHandle } from "@/components/reui/sortable"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createSkillItem, createTimelineItem, newId } from "@/lib/resume/defaults"
import { formatRange } from "@/lib/resume/format"
import { WORDS } from "@/lib/resume/i18n"
import { getPreset } from "@/lib/resume/presets"
import type { Section, SectionOf } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { updateResume, useResume } from "@/store/editor-store"

import { TextField } from "./fields"
import { MonthPicker } from "./month-picker"
import { RichText } from "./rich-text"

/** Update one section in place by id. */
function useSectionUpdater<K extends Section["kind"]>(id: string) {
  return (recipe: (s: SectionOf<K>) => void) =>
    updateResume((d) => {
      const s = d.sections.find((x) => x.id === id)
      if (s) recipe(s as SectionOf<K>)
    })
}

export function SectionBodyEditor({ section }: { section: Section }) {
  switch (section.kind) {
    case "text":
      return <TextSectionEditor section={section} />
    case "timeline":
      return <TimelineEditor section={section} />
    case "skills":
      return <SkillsEditor section={section} />
    case "links":
      return <LinksEditor section={section} />
    case "references":
      return <ReferencesEditor section={section} />
  }
}

function TextSectionEditor({ section }: { section: SectionOf<"text"> }) {
  const update = useSectionUpdater<"text">(section.id)
  const resume = useResume()
  const preset = getPreset(section.type)
  const length = section.html.replace(/<[^>]+>/g, "").length
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <RichText
        value={section.html}
        onChange={(html) => update((s) => void (s.html = html))}
        placeholder={preset.description}
        help={section.type === "summary" ? { kind: "summary", locale: resume.locale } : undefined}
      />
      {section.type === "summary" ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Recruiter tip: 400 to 600 characters reads best.</span>
          <span className={cn("tabular-nums", length >= 400 && length <= 600 && "text-emerald-600")}>{length} / 600</span>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Collapsible item card shared by list editors                         */
/* ------------------------------------------------------------------ */

function ItemCard({
  id,
  title,
  subtitle,
  onDelete,
  children,
  defaultOpen,
}: {
  id: string
  title: string
  subtitle?: string
  onDelete: () => void
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <SortableItem value={id} className="group/item rounded-lg border bg-background">
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <SortableItemHandle className="grid size-7 place-items-center text-muted-foreground opacity-40 group-hover/item:opacity-100">
          <GripVertical className="size-4" />
        </SortableItemHandle>
        <button type="button" className="min-w-0 flex-1 px-1 text-left" onClick={() => setOpen(!open)}>
          <div className="truncate text-sm font-medium">{title || "(Not specified)"}</div>
          {subtitle ? <div className="truncate text-xs text-muted-foreground">{subtitle}</div> : null}
        </button>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label={open ? "Collapse" : "Expand"}>
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 />
        </Button>
      </div>
      {open ? <div className="grid grid-cols-[minmax(0,1fr)] gap-3 border-t p-3">{children}</div> : null}
    </SortableItem>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="ghost" className="justify-start text-primary hover:text-primary" onClick={onClick}>
      <Plus /> {children}
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/* Timeline (experience, education, courses...)                        */
/* ------------------------------------------------------------------ */

function TimelineEditor({ section }: { section: SectionOf<"timeline"> }) {
  const resume = useResume()
  const update = useSectionUpdater<"timeline">(section.id)
  const preset = getPreset(section.type)
  const fields = preset.fields ?? { title: "Title", subtitle: "Subtitle", city: "City" }
  const [fresh, setFresh] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <Sortable
        value={section.items}
        getItemValue={(i) => i.id}
        onValueChange={(items) => update((s) => void (s.items = items))}
        className="grid grid-cols-[minmax(0,1fr)] gap-2"
      >
        {section.items.map((item, index) => {
          const set = (patch: Partial<typeof item>) =>
            update((s) => {
              Object.assign(s.items[index], patch)
            })
          const dates = formatRange(item.startDate, item.endDate, item.current, resume.settings.dateFormat, resume.locale)
          return (
            <ItemCard
              key={item.id}
              id={item.id}
              defaultOpen={fresh === item.id}
              title={[item.title, item.subtitle].filter(Boolean).join(", ")}
              subtitle={dates}
              onDelete={() => update((s) => void s.items.splice(index, 1))}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField label={fields.title} value={item.title} onChange={(v) => set({ title: v })} />
                <TextField label={fields.subtitle} value={item.subtitle} onChange={(v) => set({ subtitle: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <MonthPicker label="Start date" value={item.startDate} locale={resume.locale} format={resume.settings.dateFormat} onChange={(v) => set({ startDate: v })} />
                  <MonthPicker
                    label="End date"
                    value={item.current ? "" : item.endDate}
                    placeholder={item.current ? WORDS[resume.locale].present : "MM / YYYY"}
                    disabled={item.current}
                    locale={resume.locale}
                    format={resume.settings.dateFormat}
                    onChange={(v) => set({ endDate: v, current: false })}
                  />
                </div>
                {fields.city ? (
                  <TextField label={fields.city} value={item.city} onChange={(v) => set({ city: v })} />
                ) : (
                  <div />
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={item.current} onCheckedChange={(v) => set({ current: Boolean(v) })} />
                Currently here ({WORDS[resume.locale].present})
              </label>
              <div className="grid gap-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Description</Label>
                <RichText
                  value={item.description}
                  onChange={(html) => set({ description: html })}
                  placeholder="Start bullets with a verb and add numbers: Cut load time by 40% by..."
                  help={{ kind: "bullet", locale: resume.locale }}
                />
              </div>
            </ItemCard>
          )
        })}
      </Sortable>
      <AddButton
        onClick={() => {
          const item = createTimelineItem()
          setFresh(item.id)
          update((s) => void s.items.push(item))
        }}
      >
        Add {section.items.length ? "one more " : ""}
        {fields.title.toLowerCase()}
      </AddButton>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Skills and languages                                                 */
/* ------------------------------------------------------------------ */

function LevelPicker({ value, onChange, labels }: { value: number; onChange: (n: number) => void; labels: readonly string[] }) {
  return (
    <div className="grid gap-1">
      <div className="flex h-8 overflow-hidden rounded-md border">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            title={labels[n - 1]}
            onClick={() => onChange(value === n ? 0 : n)}
            className={cn("flex-1 border-r transition-colors last:border-r-0 hover:bg-primary/20", n <= value && "bg-primary/80 hover:bg-primary")}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">{value ? labels[value - 1] : "No level"}</span>
    </div>
  )
}

function SkillsEditor({ section }: { section: SectionOf<"skills"> }) {
  const resume = useResume()
  const update = useSectionUpdater<"skills">(section.id)
  const preset = getPreset(section.type)
  const words = WORDS[resume.locale]
  const labels = preset.languageLevels ? words.languageLevels : words.skillLevels

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={!section.showLevel} onCheckedChange={(v) => update((s) => void (s.showLevel = !v))} />
        Don&apos;t show level
      </label>
      <Sortable
        value={section.items}
        getItemValue={(i) => i.id}
        onValueChange={(items) => update((s) => void (s.items = items))}
        className="grid grid-cols-[minmax(0,1fr)] gap-2"
      >
        {section.items.map((item, index) => (
          <SortableItem key={item.id} value={item.id} className="group/item flex items-start gap-2 rounded-lg border bg-background p-2">
            <SortableItemHandle className="mt-1.5 grid size-7 place-items-center text-muted-foreground opacity-40 group-hover/item:opacity-100">
              <GripVertical className="size-4" />
            </SortableItemHandle>
            <Input
              value={item.name}
              placeholder={preset.languageLevels ? "Language" : "Skill"}
              onChange={(e) => update((s) => void (s.items[index].name = e.target.value))}
              className="h-9 flex-1 bg-muted/50"
            />
            {section.showLevel ? (
              <div className="w-40">
                <LevelPicker value={item.level} labels={labels} onChange={(n) => update((s) => void (s.items[index].level = n))} />
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 text-muted-foreground hover:text-destructive"
              onClick={() => update((s) => void s.items.splice(index, 1))}
              aria-label="Delete"
            >
              <Trash2 />
            </Button>
          </SortableItem>
        ))}
      </Sortable>
      <div className="flex flex-wrap gap-1">
        <AddButton onClick={() => update((s) => void s.items.push(createSkillItem()))}>
          Add {preset.languageLevels ? "language" : "skill"}
        </AddButton>
        {section.items.length > 0 ? (
          <Button variant="ghost" className="text-muted-foreground" onClick={() => update((s) => void (s.items = []))}>
            <Trash2 /> Delete all
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Links and references                                                 */
/* ------------------------------------------------------------------ */

function LinksEditor({ section }: { section: SectionOf<"links"> }) {
  const update = useSectionUpdater<"links">(section.id)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <Sortable
        value={section.items}
        getItemValue={(i) => i.id}
        onValueChange={(items) => update((s) => void (s.items = items))}
        className="grid grid-cols-[minmax(0,1fr)] gap-2"
      >
        {section.items.map((item, index) => (
          <SortableItem key={item.id} value={item.id} className="group/item flex items-center gap-2 rounded-lg border bg-background p-2">
            <SortableItemHandle className="grid size-7 place-items-center text-muted-foreground opacity-40 group-hover/item:opacity-100">
              <GripVertical className="size-4" />
            </SortableItemHandle>
            <Input
              value={item.label}
              placeholder="Label (GitHub)"
              onChange={(e) => update((s) => void (s.items[index].label = e.target.value))}
              className="h-9 w-36 bg-muted/50"
            />
            <Input
              value={item.url}
              placeholder="https://"
              onChange={(e) => update((s) => void (s.items[index].url = e.target.value))}
              className="h-9 flex-1 bg-muted/50"
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => update((s) => void s.items.splice(index, 1))}
              aria-label="Delete"
            >
              <Trash2 />
            </Button>
          </SortableItem>
        ))}
      </Sortable>
      <AddButton onClick={() => update((s) => void s.items.push({ id: newId(), label: "", url: "" }))}>Add link</AddButton>
    </div>
  )
}

function ReferencesEditor({ section }: { section: SectionOf<"references"> }) {
  const update = useSectionUpdater<"references">(section.id)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={section.onRequest} onCheckedChange={(v) => update((s) => void (s.onRequest = v))} />
        Show &quot;available upon request&quot; instead
      </label>
      {!section.onRequest ? (
        <>
          <Sortable
            value={section.items}
            getItemValue={(i) => i.id}
            onValueChange={(items) => update((s) => void (s.items = items))}
            className="grid grid-cols-[minmax(0,1fr)] gap-2"
          >
            {section.items.map((item, index) => {
              const set = (patch: Partial<typeof item>) => update((s) => void Object.assign(s.items[index], patch))
              return (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  title={item.name}
                  subtitle={item.company}
                  onDelete={() => update((s) => void s.items.splice(index, 1))}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextField label="Full name" value={item.name} onChange={(v) => set({ name: v })} />
                    <TextField label="Company" value={item.company} onChange={(v) => set({ company: v })} />
                    <TextField label="Email" value={item.email} onChange={(v) => set({ email: v })} />
                    <TextField label="Phone" value={item.phone} onChange={(v) => set({ phone: v })} />
                  </div>
                </ItemCard>
              )
            })}
          </Sortable>
          <AddButton
            onClick={() => update((s) => void s.items.push({ id: newId(), name: "", company: "", email: "", phone: "" }))}
          >
            Add reference
          </AddButton>
        </>
      ) : null}
    </div>
  )
}
