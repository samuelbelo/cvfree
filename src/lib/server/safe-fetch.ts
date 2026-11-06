import "server-only"

import dns from "node:dns"
import http from "node:http"
import https from "node:https"
import net from "node:net"

import { isBlockedHostname, isPrivateAddress } from "./address"

/*
 * Fetch a page from the public internet, and nothing else. The address check
 * runs inside the socket's own DNS lookup, so the IP that was checked is the
 * IP that gets connected to. Redirects are followed by hand and checked again.
 */

const MAX_REDIRECTS = 5
const MAX_BYTES = 2_000_000

class BlockedAddressError extends Error {
  constructor(public readonly address: string) {
    super("Private addresses are not allowed")
  }
}

/** A lookup that refuses private results, in the shape net.connect expects. */
const guardedLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, [])
    const list = (addresses as dns.LookupAddress[]) ?? []
    const bad = list.find((a) => isPrivateAddress(a.address))
    if (bad || !list.length) return callback(new BlockedAddressError(bad?.address ?? hostname), [])
    callback(null, list)
  })
}

export type FetchedPage = { url: string; status: number; contentType: string; body: string }

function requestOnce(url: URL, timeoutMs: number): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http
    const req = lib.request(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        timeout: timeoutMs,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; cvfree/0.1)", Accept: "text/html,application/xhtml+xml" },
      },
      (res) => {
        const chunks: Buffer[] = []
        let size = 0
        res.on("data", (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BYTES) {
            res.destroy()
            return
          }
          chunks.push(chunk)
        })
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }))
        res.on("error", reject)
      }
    )
    req.on("timeout", () => req.destroy(new Error("The page took too long to answer")))
    req.on("error", reject)
    req.end()
  })
}

/**
 * GET a public http(s) URL as text. Throws a plain Error with a message safe
 * to show to the user.
 */
export async function fetchPublicPage(input: string, timeoutMs = 15_000): Promise<FetchedPage> {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error("Invalid URL")
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!/^https?:$/.test(url.protocol)) throw new Error("Only http and https links")
    if (url.username || url.password) throw new Error("Links with credentials are not allowed")
    const host = url.hostname.replace(/^\[|\]$/g, "")
    if (isBlockedHostname(host) || (net.isIP(host) && isPrivateAddress(host))) {
      throw new Error("Private addresses are not allowed")
    }
    let res
    try {
      res = await requestOnce(url, timeoutMs)
    } catch (e) {
      if (e instanceof BlockedAddressError) throw new Error("Private addresses are not allowed")
      throw e
    }
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
      url = new URL(res.headers.location, url)
      continue
    }
    return { url: url.toString(), status: res.status, contentType: String(res.headers["content-type"] ?? ""), body: res.body }
  }
  throw new Error("Too many redirects")
}
