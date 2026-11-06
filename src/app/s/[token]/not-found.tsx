import Link from "next/link"
import { Link2Off } from "lucide-react"

/** Shown for an unknown or revoked public link. Says nothing about whether the resume exists. */
export default function SharedResumeNotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/40 p-6">
      <div className="grid max-w-sm justify-items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Link2Off className="size-5" />
        </span>
        <h1 className="text-lg font-semibold">This link is not valid any more</h1>
        <p className="text-sm text-muted-foreground">
          The person who shared this resume may have revoked the link, or the address was copied incompletely. Ask them for a new one.
        </p>
        <Link href="https://github.com/samuelbelo/cvfree" className="text-xs text-muted-foreground hover:text-foreground">
          Made with cvfree, the open-source resume builder
        </Link>
      </div>
    </div>
  )
}
