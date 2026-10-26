"use client"

import { useEffect, useState } from "react"
import TextAlign from "@tiptap/extension-text-align"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
  type LucideIcon,
} from "lucide-react"

import { PromptDialog } from "@/components/app/prompt-dialog"
import { hrefFor } from "@/lib/resume/format"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

function Btn({ icon: Icon, active, onClick, label }: { icon: LucideIcon; active?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground",
        active && "bg-background text-foreground shadow-sm"
      )}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

/** Small rich text editor. Stores HTML, which templates render as is. */
export function RichText({ value, onChange, placeholder, minHeight = 110 }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "cv-editor-content outline-none px-3 py-2.5 text-sm leading-relaxed",
        style: `min-height:${minHeight}px`,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  })

  // Keep in sync when the value changes from outside (undo, AI suggestion, import).
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? "" : editor.getHTML()
    if (current !== value) editor.commands.setContent(value || "", { emitUpdate: false })
  }, [editor, value])

  // The editor re-renders on every transaction (see shouldRerenderOnTransaction),
  // so the active marks can be read straight from it.
  const state = editor
    ? {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        bullet: editor.isActive("bulletList"),
        ordered: editor.isActive("orderedList"),
        link: editor.isActive("link"),
        left: editor.isActive({ textAlign: "left" }),
        center: editor.isActive({ textAlign: "center" }),
        right: editor.isActive({ textAlign: "right" }),
        justify: editor.isActive({ textAlign: "justify" }),
      }
    : null

  const [linkOpen, setLinkOpen] = useState(false)
  const chain = () => editor!.chain().focus()

  return (
    <div className="rounded-lg border bg-muted/40 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
        {editor && state ? (
          <>
            <Btn icon={Bold} label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()} />
            <Btn icon={Italic} label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()} />
            <Btn icon={Underline} label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()} />
            <Btn icon={Strikethrough} label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()} />
            <span className="mx-1 h-4 w-px bg-border" />
            <Btn icon={AlignLeft} label="Align left" active={state.left} onClick={() => chain().setTextAlign("left").run()} />
            <Btn icon={AlignCenter} label="Center" active={state.center} onClick={() => chain().setTextAlign("center").run()} />
            <Btn icon={AlignRight} label="Align right" active={state.right} onClick={() => chain().setTextAlign("right").run()} />
            <Btn icon={AlignJustify} label="Justify" active={state.justify} onClick={() => chain().setTextAlign("justify").run()} />
            <span className="mx-1 h-4 w-px bg-border" />
            <Btn icon={ListOrdered} label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()} />
            <Btn icon={List} label="Bullet list" active={state.bullet} onClick={() => chain().toggleBulletList().run()} />
            <span className="mx-1 h-4 w-px bg-border" />
            <Btn
              icon={Link2}
              label="Link"
              active={state.link}
              onClick={() => {
                if (state.link) return chain().unsetLink().run()
                setLinkOpen(true)
              }}
            />
          </>
        ) : (
          <div className="h-7" />
        )}
      </div>
      <EditorContent editor={editor} />
      <PromptDialog
        open={linkOpen}
        title="Add link"
        placeholder="https://example.com"
        confirmLabel="Add link"
        onOpenChange={setLinkOpen}
        onConfirm={(url) => url && chain().extendMarkRange("link").setLink({ href: hrefFor(url) }).run()}
      />
    </div>
  )
}
