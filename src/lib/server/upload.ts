import "server-only"

import { NextResponse } from "next/server"

/** The largest file a route takes as a raw body. Keep in step with proxyClientMaxBodySize in next.config.ts. */
export const MAX_UPLOAD = 100 * 1024 * 1024

type Upload = { body: Buffer; error?: undefined } | { body?: undefined; error: NextResponse }

/** The raw request body, or the response to send back when it is too large or arrived cut short. */
export async function readUpload(request: Request): Promise<Upload> {
  const tooLarge = () => ({ error: NextResponse.json({ error: "This file is larger than the 100 MB this app accepts" }, { status: 413 }) })
  const declared = Number(request.headers.get("content-length") ?? "")
  if (declared > MAX_UPLOAD) return tooLarge()

  const body = Buffer.from(await request.arrayBuffer())
  if (body.length > MAX_UPLOAD) return tooLarge()
  // A body past the proxy limit arrives cut off with no error, so a short read is checked here.
  if (declared > 0 && body.length !== declared) {
    return { error: NextResponse.json({ error: "The upload was cut short. Try again." }, { status: 400 }) }
  }
  return { body }
}
