import { AppHeader } from "@/components/app/app-header"
import { Dashboard } from "@/components/app/dashboard"
import { config } from "@/lib/server/config"
import { listLetters } from "@/lib/server/letters"
import { getAllResumes, getUnreadableResumeFiles } from "@/lib/server/repo"

export const dynamic = "force-dynamic"

export default async function Home() {
  const [resumes, letters, unreadable] = await Promise.all([getAllResumes(), listLetters(), getUnreadableResumeFiles()])
  return (
    <div className="min-h-dvh bg-muted/40">
      <AppHeader showLogout={Boolean(config.password)} />
      <Dashboard resumes={resumes} letters={letters} unreadable={unreadable} dataDir={config.dataDir} />
    </div>
  )
}
