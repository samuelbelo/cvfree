"use client"

import Link from "next/link"
import { FileText, Settings } from "lucide-react"

import { useT } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"

import { LogoutButton } from "./logout-button"

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <FileText className="size-4" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        cvfree<span className="text-primary">.io</span>
      </span>
    </Link>
  )
}

export function AppHeader({ showLogout }: { showLogout: boolean }) {
  const t = useT()
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Logo />
        <nav className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            {t("Resumes")}
          </Button>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/settings" />}>
            <Settings /> {t("Settings")}
          </Button>
          {showLogout ? <LogoutButton /> : null}
        </nav>
      </div>
    </header>
  )
}
