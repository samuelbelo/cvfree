"use client"

import { useId, useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate } from "@/lib/resume/format"
import type { DateFormat, Locale } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"

/** Short month names in the resume's language, the same ones the preview prints. */
function monthNames(locale: Locale): string[] {
  return Array.from({ length: 12 }, (_, i) => formatDate(`2000-${String(i + 1).padStart(2, "0")}`, "MMM YYYY", locale).replace(/\s*2000$/, ""))
}

function parse(value: string) {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(value)
  return m ? { year: Number(m[1]), month: m[2] ? Number(m[2]) : null } : null
}

/**
 * Month and year picker. Stores "YYYY-MM", or "YYYY" when only the year is
 * known. Native month inputs are missing in Firefox and Safari, so this
 * works the same everywhere.
 */
export function MonthPicker({
  label,
  value,
  onChange,
  disabled,
  placeholder = "MM / YYYY",
  locale = "en",
  format = "MMM YYYY",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** Language and date format of the resume, so the field reads like the preview. */
  locale?: Locale
  format?: DateFormat
}) {
  const id = useId()
  const parsed = parse(value)
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(parsed?.year ?? new Date().getFullYear())
  const MONTHS = useMemo(() => monthNames(locale), [locale])

  const display = parsed ? formatDate(value, format, locale) : ""

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setYear(parse(value)?.year ?? new Date().getFullYear())
          setOpen(next)
        }}
      >
        <PopoverTrigger
          id={id}
          disabled={disabled}
          render={
            <button
              type="button"
              className={cn(
                "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-muted/50 px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                !display && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{display || placeholder}</span>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" size="icon" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft />
            </Button>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm font-semibold hover:bg-muted"
              title="Use the year only"
              onClick={() => {
                onChange(String(year))
                setOpen(false)
              }}
            >
              {year}
            </button>
            <Button variant="ghost" size="icon" aria-label="Next year" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1" role="grid" aria-label={`Months of ${year}`}>
            {MONTHS.map((name, i) => {
              const selected = parsed?.year === year && parsed.month === i + 1
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(`${year}-${String(i + 1).padStart(2, "0")}`)
                    setOpen(false)
                  }}
                  className={cn(
                    "rounded-md py-1.5 text-sm hover:bg-muted",
                    selected && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {name}
                </button>
              )
            })}
          </div>
          {value ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-muted-foreground"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              <X /> Clear
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}
