"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { useT } from "@/components/app/i18n-provider"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const t = useT()
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" })
        router.replace("/login")
        router.refresh()
      }}
    >
      <LogOut /> {t("Sign out")}
    </Button>
  )
}
