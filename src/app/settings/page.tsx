import { headers } from "next/headers"

import { AppHeader } from "@/components/app/app-header"
import { McpSetup } from "@/components/app/mcp-setup"
import { SettingsForm } from "@/components/app/settings-form"
import { getAppSettings } from "@/lib/server/app-settings"
import { aiEnabled, config } from "@/lib/server/config"
import { findChrome } from "@/lib/server/pdf"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const settings = await getAppSettings()
  const chrome = findChrome()
  const h = await headers()
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
  const endpoint = `${proto}://${h.get("host") ?? "localhost:3000"}/mcp`
  const mcpState = config.mcpToken ? "token" : config.password ? "off" : "open"
  const status = [
    { label: "Data folder", value: config.dataDir, ok: true, hint: "Back this folder up to keep your resumes safe." },
    {
      label: "PDF engine",
      value: chrome ?? "Not found",
      ok: Boolean(chrome),
      hint: chrome ? "Headless Chrome renders pixel-exact PDFs." : "Install Chrome/Chromium or set CHROME_PATH. Browser printing still works.",
    },
    {
      label: "AI features",
      value: aiEnabled() ? `${config.ai.model} via ${config.ai.baseUrl}` : "Off",
      ok: aiEnabled(),
      hint: "Set AI_MODEL, AI_API_KEY and AI_BASE_URL (any OpenAI-compatible API, Ollama included).",
    },
    {
      label: "Password",
      value: config.password ? "On" : "Off",
      ok: Boolean(config.password),
      hint: "Set CVFREE_PASSWORD before exposing the app on the internet.",
    },
    {
      label: "MCP",
      value: mcpState === "token" ? "On, token required" : mcpState === "open" ? "On, no token" : "Off",
      ok: mcpState === "token",
      hint: "Lets an AI assistant edit the resumes. See the MCP section below.",
    },
    { label: "Version", value: config.version, ok: true, hint: "" },
  ]

  return (
    <div className="min-h-dvh bg-muted/40">
      <AppHeader showLogout={Boolean(config.password)} />
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">Defaults for new resumes and the state of this instance.</p>
        </div>

        <SettingsForm initial={settings} />

        <section className="rounded-xl border bg-card shadow-xs">
          <h2 className="border-b px-5 py-3 font-semibold">Instance</h2>
          <dl className="divide-y">
            {status.map((s) => (
              <div key={s.label} className="grid gap-1 px-5 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${s.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <code className="break-all">{s.value}</code>
                  </span>
                  {s.hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
          <p className="border-t px-5 py-3 text-xs text-muted-foreground">
            These values come from environment variables. Change them in your <code>.env</code> or{" "}
            <code>docker-compose.yml</code> and restart.
          </p>
        </section>

        <section className="rounded-xl border bg-card shadow-xs">
          <h2 className="border-b px-5 py-3 font-semibold">MCP</h2>
          <McpSetup endpoint={endpoint} state={mcpState} />
        </section>
      </main>
    </div>
  )
}
