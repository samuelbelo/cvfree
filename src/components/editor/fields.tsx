"use client"

import { useId, type ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  className?: string
  hint?: ReactNode
}) {
  const id = useId()
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 bg-muted/50"
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? <Label className="text-xs font-normal text-muted-foreground">{label}</Label> : null}
      <Select items={options} value={value} onValueChange={(v) => v && onChange(v as T)}>
        <SelectTrigger className="h-10 w-full bg-muted/50" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  format,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  format?: (n: number) => string
}) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-3">
      <Label className="text-sm font-normal">{label}</Label>
      <Slider
        thumbLabel={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as number))}
      />
      <span className="rounded-md bg-muted px-2 py-1 text-center text-xs tabular-nums">
        {format ? format(value) : `${Number(value.toFixed(2))}${unit}`}
      </span>
    </div>
  )
}

/** Row of big tappable choices, used for layout options. */
export function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
  columns,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; preview?: ReactNode }[]
  columns?: number
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
            value === o.value && "border-primary bg-primary/5 ring-1 ring-primary"
          )}
        >
          {o.preview ? <div className="mb-1.5">{o.preview}</div> : null}
          {o.label}
        </button>
      ))}
    </div>
  )
}
