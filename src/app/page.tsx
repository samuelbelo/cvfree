import { AppHeader } from "@/components/app/app-header"
import { Dashboard } from "@/components/app/dashboard"
import { config } from "@/lib/server/config"
import { getAllResumes } from "@/lib/server/repo"

export const dynamic = "force-dynamic"

export default async function Home() {
  const resumes = await getAllResumes()
  return (
    <div className="min-h-dvh bg-muted/40">
      <AppHeader showLogout={Boolean(config.password)} />
      <Dashboard resumes={resumes} />
    </div>
  )
}
