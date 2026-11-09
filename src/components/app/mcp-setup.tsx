"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { useT } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"
import { rich } from "@/lib/ui/rich"

type Props = {
  endpoint: string
  /** "token": bearer token required. "open": no password, no token. "off": password set, no token. */
  state: "token" | "open" | "off"
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard access can be denied (plain http, embedded views). Fall back to the old selection copy.
      const area = document.createElement("textarea")
      area.value = text
      area.setAttribute("readonly", "")
      area.style.position = "fixed"
      area.style.opacity = "0"
      document.body.appendChild(area)
      area.select()
      const done = document.execCommand("copy")
      area.remove()
      if (!done) {
        toast.error(t("Could not copy. Select the text and copy it by hand."))
        return
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button size="sm" variant="ghost" onClick={copy} className="h-7 px-2 text-xs">
          {copied ? <Check /> : <Copy />} {copied ? t("Copied") : t("Copy")}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs leading-relaxed">{text}</pre>
    </div>
  )
}

/** Connection snippets for the MCP endpoint. The token itself is never shown, only its variable name. */
export function McpSetup({ endpoint, state }: Props) {
  const t = useT()
  const header = state === "token" ? ' --header "Authorization: Bearer $CVFREE_MCP_TOKEN"' : ""
  const headers = state === "token" ? `,\n      "headers": { "Authorization": "Bearer <your CVFREE_MCP_TOKEN>" }` : ""
  const claudeCode = `claude mcp add --transport http cvfree ${endpoint}${header}`
  const json = `{\n  "mcpServers": {\n    "cvfree": {\n      "type": "http",\n      "url": "${endpoint}"${headers}\n    }\n  }\n}`
  return (
    <div className="grid gap-4 px-5 py-4">
      <p className="text-sm text-muted-foreground">
        {rich(
          t(
            "Any MCP client (Claude Code, Claude Desktop, Cursor, your own agent) can list, review, edit and export the resumes and cover letters on this instance through {endpoint}. Every write goes through the same checks as the editor."
          ),
          { endpoint: <code>{endpoint}</code> }
        )}
      </p>
      {state === "off" ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          {rich(
            t("The endpoint is off. The app has a password, so MCP needs its own secret: set {token} (a long random string, for example {command}) and restart."),
            { token: <code>CVFREE_MCP_TOKEN</code>, command: <code>openssl rand -hex 32</code> }
          )}
        </p>
      ) : null}
      {state === "open" ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          {rich(
            t("No password and no token: anyone who can reach this port can use the endpoint, like the rest of the app. Set {token} before exposing it."),
            { token: <code>CVFREE_MCP_TOKEN</code> }
          )}
        </p>
      ) : null}
      <CopyBlock label="Claude Code" text={claudeCode} />
      <CopyBlock label={t("Claude Desktop, Cursor and others (mcp.json)")} text={json} />
    </div>
  )
}
