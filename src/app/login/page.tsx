"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Lock } from "lucide-react"

import { Logo } from "@/components/app/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function LoginForm() {
  const params = useSearchParams()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      const next = params.get("next") ?? ""
      // Only a path on this site. "//host" and "/\host" would leave it.
      window.location.href = /^\/(?![/\\])/.test(next) ? next : "/"
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error || "Wrong password")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid w-full max-w-sm gap-4 rounded-2xl border bg-card p-8 shadow-sm">
      <Logo />
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">This cvfree instance is protected with a password.</p>
      </div>
      <div className="relative">
        <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="h-10 pl-9"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-10" disabled={!password || loading}>
        {loading ? <Loader2 className="animate-spin" /> : null} Continue
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/40 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
