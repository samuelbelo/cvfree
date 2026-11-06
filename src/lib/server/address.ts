import net from "node:net"

/*
 * Which addresses the server may never talk to on behalf of a user. Kept
 * free of "server-only" so the rules can be unit tested.
 */

/** True for loopback, link-local, private, CGNAT, multicast and reserved ranges, in v4 and v6. */
export function isPrivateAddress(ip: string): boolean {
  let v4 = ip
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, "")
    // IPv4 mapped (::ffff:a.b.c.d) or NAT64 (64:ff9b::a.b.c.d): check the inner IPv4.
    const mapped = /^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower)
    if (mapped) v4 = mapped[1]
    else {
      const hex = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower)
      if (hex) {
        const a = parseInt(hex[1], 16)
        const b = parseInt(hex[2], 16)
        v4 = `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`
      } else {
        if (lower === "::" || lower === "::1") return true
        const first = parseInt(lower.split(":")[0] || "0", 16)
        if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
        if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link local
        if ((first & 0xffc0) === 0xfec0) return true // fec0::/10 site local
        if ((first & 0xff00) === 0xff00) return true // ff00::/8 multicast
        return false
      }
    }
  }
  if (!net.isIPv4(v4)) return true
  const [a, b] = v4.split(".").map(Number)
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0) return true // 192.0.0.0/24 and 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a >= 224) return true // multicast and reserved
  return false
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "")
  return h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".home.arpa")
}
