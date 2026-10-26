"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  ChevronDown,
  Columns2,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import { Sortable, SortableItem, SortableItemHandle } from "@/components/reui/sortable"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { completeness } from "@/lib/resume/analysis"
import { createSection } from "@/lib/resume/defaults"
import { sectionTitle } from "@/lib/resume/format"
import { getPreset, SECTION_PRESETS } from "@/lib/resume/presets"
import type { PageNumbering, Personal, Section } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { updateResume, useResume } from "@/store/editor-store"
import { getTemplate } from "@/templates/registry"

import { ChoiceGroup, TextField } from "./fields"
import { MonthPicker } from "./month-picker"
import { PhotoUpload } from "./photo-upload"
import { SectionBodyEditor } from "./section-editors"

export function Card({
  title,
  description,
  children,
  handle,
  actions,
  defaultOpen = true,
  muted,
}: {
  title: ReactNode
  description?: string
  children: ReactNode
  handle?: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
  muted?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cn("group/card rounded-xl border bg-card shadow-xs", muted && "opacity-60")}>
      <div className="flex items-center gap-1 px-4 py-3">
        {handle}
        <div className="min-w-0 flex-1">{title}</div>
        {actions}
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label={open ? "Collapse" : "Expand"}>
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {open ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-4 pb-4">
          {description ? <p className="-mt-2 text-xs text-muted-foreground">{description}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function EditPanel() {
  const resume = useResume()
  const { score, missing } = useMemo(() => completeness(resume), [resume])

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-semibold text-white",
              score >= 80 ? "bg-emerald-600" : score >= 50 ? "bg-amber-500" : "bg-rose-500"
            )}
          >
            {score}%
          </span>
          <span className="text-muted-foreground">Resume completeness</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", score >= 80 ? "bg-emerald-600" : score >= 50 ? "bg-amber-500" : "bg-rose-500")}
            style={{ width: `${score}%` }}
          />
        </div>
        {missing.length ? <p className="mt-2 text-xs text-muted-foreground">Next: {missing[0]}</p> : null}
      </div>

      <HeaderFooterCard />
      <PersonalCard />
      <SectionsList />
      <AddSection />
    </div>
  )
}

function HeaderFooterCard() {
  const { settings } = useResume()
  const set = (patch: Partial<typeof settings>) => updateResume((d) => void Object.assign(d.settings, patch))
  return (
    <Card title={<h2 className="font-semibold">Header &amp; Footer</h2>} defaultOpen={false}>
      <TextField label="Header text" value={settings.headerText} placeholder="Shown at the top of every PDF page" onChange={(v) => set({ headerText: v })} />
      <TextField label="Footer text" value={settings.footerText} placeholder="Shown at the bottom of every PDF page" onChange={(v) => set({ footerText: v })} />
      <div className="grid gap-1.5">
        <span className="text-xs text-muted-foreground">Page numbering</span>
        <ChoiceGroup<PageNumbering>
          value={settings.pageNumbering}
          onChange={(v) => set({ pageNumbering: v })}
          options={[
            { value: "none", label: "None" },
            { value: "numbers", label: "1, 2, 3" },
            { value: "fraction", label: "1/3" },
            { value: "page", label: "Page 1 of 3" },
          ]}
        />
      </div>
    </Card>
  )
}

function PersonalCard() {
  const { personal: p, settings } = useResume()
  const [more, setMore] = useState(Boolean(p.address || p.nationality || p.dateOfBirth || p.placeOfBirth || p.drivingLicense))
  const set = (patch: Partial<Personal>) => updateResume((d) => void Object.assign(d.personal, patch))
  const template = getTemplate(settings.template)

  return (
    <Card title={<h2 className="font-semibold">Personal Details</h2>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Job title" value={p.jobTitle} placeholder="e.g. Senior Product Engineer" onChange={(v) => set({ jobTitle: v })} />
        <div className="grid gap-1">
          <PhotoUpload value={p.photo} onChange={(photo) => set({ photo })} />
          {p.photo && !template.supportsPhoto ? (
            <p className="text-[11px] text-amber-600">The {template.name} template does not show photos.</p>
          ) : null}
        </div>
        <TextField label="First name" value={p.firstName} onChange={(v) => set({ firstName: v })} />
        <TextField label="Last name" value={p.lastName} onChange={(v) => set({ lastName: v })} />
        <TextField label="Email" type="email" value={p.email} onChange={(v) => set({ email: v })} />
        <TextField label="Phone" type="tel" value={p.phone} onChange={(v) => set({ phone: v })} />
        <TextField label="LinkedIn" value={p.linkedin} placeholder="linkedin.com/in/you" onChange={(v) => set({ linkedin: v })} />
        <TextField label="Website" value={p.website} placeholder="yourname.dev" onChange={(v) => set({ website: v })} />
        <TextField label="City" value={p.city} onChange={(v) => set({ city: v })} />
        <TextField label="Country" value={p.country} onChange={(v) => set({ country: v })} />
        {more ? (
          <>
            <TextField label="Address" value={p.address} onChange={(v) => set({ address: v })} className="sm:col-span-2" />
            <TextField label="Postal code" value={p.postalCode} onChange={(v) => set({ postalCode: v })} />
            <TextField label="Nationality" value={p.nationality} onChange={(v) => set({ nationality: v })} />
            <TextField label="Place of birth" value={p.placeOfBirth} onChange={(v) => set({ placeOfBirth: v })} />
            <MonthPicker label="Date of birth" value={p.dateOfBirth} onChange={(v) => set({ dateOfBirth: v })} />
            <TextField label="Driving license" value={p.drivingLicense} placeholder="e.g. B" onChange={(v) => set({ drivingLicense: v })} />
          </>
        ) : null}
      </div>
      <Button variant="link" className="h-auto justify-start p-0" onClick={() => setMore(!more)}>
        {more ? "Hide additional details" : "Add more details"}
        <ChevronDown className={cn("transition-transform", more && "rotate-180")} />
      </Button>
    </Card>
  )
}

function SectionsList() {
  const resume = useResume()
  return (
    <Sortable
      value={resume.sections}
      getItemValue={(s) => s.id}
      onValueChange={(sections) => updateResume((d) => void (d.sections = sections))}
      className="grid grid-cols-[minmax(0,1fr)] gap-4"
    >
      {resume.sections.map((section) => (
        <SortableItem key={section.id} value={section.id}>
          <SectionCard section={section} />
        </SortableItem>
      ))}
    </Sortable>
  )
}

function SectionCard({ section }: { section: Section }) {
  const resume = useResume()
  const preset = getPreset(section.type)
  const [renaming, setRenaming] = useState(false)
  const title = sectionTitle(section, resume.locale)
  const template = getTemplate(resume.settings.template)
  const twoColumn = template.tags.includes("two-column")
  const set = (recipe: (s: Section) => void) =>
    updateResume((d) => {
      const s = d.sections.find((x) => x.id === section.id)
      if (s) recipe(s)
    })

  return (
    <Card
      muted={section.hidden}
      handle={
        <SortableItemHandle className="-ml-2 grid size-7 place-items-center text-muted-foreground opacity-40 group-hover/card:opacity-100">
          <GripVertical className="size-4" />
        </SortableItemHandle>
      }
      title={
        renaming ? (
          <input
            autoFocus
            defaultValue={title}
            className="w-full rounded-md border bg-background px-2 py-1 font-semibold outline-none focus:ring-2 focus:ring-ring/40"
            onBlur={(e) => {
              const v = e.target.value.trim()
              set((s) => void (s.title = v === preset.titles[resume.locale] ? "" : v))
              setRenaming(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") setRenaming(false)
            }}
          />
        ) : (
          <button type="button" className="group/title flex items-center gap-2 text-left" onClick={() => setRenaming(true)}>
            <h2 className="font-semibold">{title}</h2>
            <Pencil className="size-3.5 text-muted-foreground opacity-0 group-hover/title:opacity-100" />
            {section.hidden ? <span className="text-xs font-normal text-muted-foreground">(hidden)</span> : null}
          </button>
        )
      }
      description={preset.description}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Section options" />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setRenaming(true)}>
              <Pencil /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => set((s) => void (s.hidden = !s.hidden))}>
              {section.hidden ? <Eye /> : <EyeOff />} {section.hidden ? "Show in resume" : "Hide from resume"}
            </DropdownMenuItem>
            {twoColumn ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Columns2 /> Column
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={section.column} onValueChange={(v) => set((s) => void (s.column = v as Section["column"]))}>
                    <DropdownMenuRadioItem value="auto">Automatic ({preset.column === "main" ? "main" : "side"})</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="main">Main column</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="side">Side column</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => updateResume((d) => void (d.sections = d.sections.filter((s) => s.id !== section.id)))}
            >
              <Trash2 /> Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <SectionBodyEditor section={section} />
    </Card>
  )
}

function AddSection() {
  const resume = useResume()
  const present = new Set(resume.sections.map((s) => s.type))
  const available = SECTION_PRESETS.filter((p) => !p.single || !present.has(p.type))
  return (
    <div className="rounded-xl border border-dashed p-4">
      <h2 className="mb-3 font-semibold">Add section</h2>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {available.map((preset) => (
          <Button
            key={preset.type}
            variant="ghost"
            className="h-auto min-h-8 justify-start py-1.5 text-left whitespace-normal"
            onClick={() => updateResume((d) => void d.sections.push(createSection(preset.type)))}
          >
            <Plus className="text-primary" />
            {preset.type.startsWith("custom") ? `${preset.titles.en} (${preset.kind === "text" ? "text" : preset.kind === "skills" ? "list" : "entries"})` : preset.titles.en}
          </Button>
        ))}
      </div>
    </div>
  )
}
