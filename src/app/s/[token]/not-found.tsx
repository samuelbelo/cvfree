import Link from "next/link"
import { Link2Off } from "lucide-react"

import { getAppSettings } from "@/lib/server/app-settings"
import { translator } from "@/lib/ui/translate"

/** Shown for an unknown or revoked public link. Says nothing about whether the resume exists. */
export default async function SharedResumeNotFound() {
  // There is no resume to take the language from here, so the one picked in Settings is the best guess.
  const t = translator((await getAppSettings()).uiLocale)
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/40 p-6">
      <div className="grid max-w-sm justify-items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Link2Off className="size-5" />
        </span>
        <h1 className="text-lg font-semibold">{t("This link is not valid any more")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("The person who shared this resume may have revoked the link, or the address was copied incompletely. Ask them for a new one.")}
        </p>
        <Link href="https://github.com/samuelbelo/cvfree" className="text-xs text-muted-foreground hover:text-foreground">
          {t("Made with cvfree, the open-source resume builder")}
        </Link>
      </div>
    </div>
  )
}
