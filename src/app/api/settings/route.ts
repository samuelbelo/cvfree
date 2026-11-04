import { NextResponse } from "next/server"

import { getAppSettings, saveAppSettings } from "@/lib/server/app-settings"

export async function GET() {
  return NextResponse.json(await getAppSettings())
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}))
  return NextResponse.json(await saveAppSettings(body))
}
