import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { connection } from "next/server"

import { I18nProvider } from "@/components/app/i18n-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getAppSettings } from "@/lib/server/app-settings"

import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "cvfree · open-source resume builder",
  description: "Build, customize and export resumes. Self-hosted and free.",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The interface language is a setting, so it is read on every request and never baked into a prerendered page.
  await connection()
  const { uiLocale } = await getAppSettings()
  return (
    <html lang={uiLocale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider locale={uiLocale}>
          <TooltipProvider>{children}</TooltipProvider>
        </I18nProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
