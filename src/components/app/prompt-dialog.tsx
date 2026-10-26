"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

/** Small dialog that asks for one line of text. Replaces window.prompt. */
export function PromptDialog({
  open,
  title,
  label,
  initial = "",
  placeholder,
  confirmLabel = "Save",
  onConfirm,
  onOpenChange,
}: {
  open: boolean
  title: string
  label?: string
  initial?: string
  placeholder?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Keyed so each opening starts from the current initial value. */}
        <PromptForm
          key={open ? `open-${initial}` : "closed"}
          title={title}
          label={label}
          initial={initial}
          placeholder={placeholder}
          confirmLabel={confirmLabel}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}

function PromptForm({
  title,
  label,
  initial,
  placeholder,
  confirmLabel,
  onConfirm,
  onOpenChange,
}: {
  title: string
  label?: string
  initial: string
  placeholder?: string
  confirmLabel: string
  onConfirm: (value: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm(value.trim())
        onOpenChange(false)
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Input
        autoFocus
        aria-label={label ?? title}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        className="h-10"
      />
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!value.trim()}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
