import "server-only"

import { crc32, deflateRawSync, inflateRawSync } from "node:zlib"

/*
 * A small zip writer and reader, enough for backups and for the exports other
 * services hand out. Deflate or stored entries, no encryption, no zip64.
 */

export type ZipEntry = { name: string; data: Buffer }

const LOCAL = 0x04034b50
const CENTRAL = 0x02014b50
const END = 0x06054b50
/** Bit 11 says the file name is UTF-8. */
const UTF8_NAME = 0x0800
const MAX_32 = 0xffffffff

/** Zip keeps time the DOS way: two seconds of precision, local time, years from 1980. */
function dosDateTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

export function zip(entries: ZipEntry[], at = new Date()): Buffer {
  if (entries.length > 0xffff) throw new Error("Too many files for one zip")
  const { time, date } = dosDateTime(at)
  const parts: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8")
    const packed = deflateRawSync(entry.data, { level: 6 })
    const sum = crc32(entry.data)
    if (entry.data.length > MAX_32 || offset > MAX_32) throw new Error("Backup is too large for one zip")

    const local = Buffer.alloc(30)
    local.writeUInt32LE(LOCAL, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(UTF8_NAME, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(sum, 14)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    parts.push(local, name, packed)

    const head = Buffer.alloc(46)
    head.writeUInt32LE(CENTRAL, 0)
    head.writeUInt16LE(20, 4)
    head.writeUInt16LE(20, 6)
    head.writeUInt16LE(UTF8_NAME, 8)
    head.writeUInt16LE(8, 10)
    head.writeUInt16LE(time, 12)
    head.writeUInt16LE(date, 14)
    head.writeUInt32LE(sum, 16)
    head.writeUInt32LE(packed.length, 20)
    head.writeUInt32LE(entry.data.length, 24)
    head.writeUInt16LE(name.length, 28)
    head.writeUInt32LE(offset, 42)
    central.push(head, name)

    offset += local.length + name.length + packed.length
  }

  const directory = Buffer.concat(central)
  if (offset > MAX_32) throw new Error("Backup is too large for one zip")
  const end = Buffer.alloc(22)
  end.writeUInt32LE(END, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, directory, end])
}

export type UnzipLimits = {
  /** Most files read. More than this and the zip is refused. */
  maxEntries: number
  /** Largest single file once unpacked, in bytes. Bigger ones are skipped. */
  maxEntryBytes: number
  /** Everything unpacked together, in bytes. Past this the zip is refused. */
  maxTotalBytes: number
  /** Only names that pass are unpacked. The rest cost nothing. */
  filter?: (name: string) => boolean
}

/**
 * Read a zip that sits in memory. Sizes are checked while unpacking and not
 * taken from the headers, so a tiny file that expands forever stops at the limit.
 */
export function unzip(buffer: Buffer, limits: UnzipLimits): ZipEntry[] {
  // The end record is the last thing in the file, followed at most by a comment of 65535 bytes.
  let end = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 0xffff); i--) {
    if (buffer.readUInt32LE(i) === END) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error("Not a zip file")

  const count = buffer.readUInt16LE(end + 10)
  const directorySize = buffer.readUInt32LE(end + 12)
  let at = buffer.readUInt32LE(end + 16)
  if (count === 0xffff || at === MAX_32 || directorySize === MAX_32) throw new Error("This zip is too large to read here")
  if (count > limits.maxEntries) throw new Error("This zip holds too many files")
  if (at + directorySize > buffer.length) throw new Error("This zip is damaged")

  const out: ZipEntry[] = []
  let total = 0
  for (let n = 0; n < count; n++) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== CENTRAL) throw new Error("This zip is damaged")
    const flags = buffer.readUInt16LE(at + 8)
    const method = buffer.readUInt16LE(at + 10)
    const packedSize = buffer.readUInt32LE(at + 20)
    const nameLength = buffer.readUInt16LE(at + 28)
    const extraLength = buffer.readUInt16LE(at + 30)
    const commentLength = buffer.readUInt16LE(at + 32)
    const localAt = buffer.readUInt32LE(at + 42)
    const name = buffer.toString(flags & UTF8_NAME ? "utf8" : "latin1", at + 46, at + 46 + nameLength).replace(/\\/g, "/")
    at += 46 + nameLength + extraLength + commentLength

    if (name.endsWith("/") || (limits.filter && !limits.filter(name))) continue
    if (flags & 1) throw new Error("This zip is password protected")
    if (method !== 0 && method !== 8) continue
    if (localAt + 30 > buffer.length || buffer.readUInt32LE(localAt) !== LOCAL) throw new Error("This zip is damaged")
    const start = localAt + 30 + buffer.readUInt16LE(localAt + 26) + buffer.readUInt16LE(localAt + 28)
    if (start + packedSize > buffer.length) throw new Error("This zip is damaged")
    const packed = buffer.subarray(start, start + packedSize)

    let data: Buffer
    if (method === 0) {
      if (packed.length > limits.maxEntryBytes) continue
      data = Buffer.from(packed)
    } else {
      try {
        data = inflateRawSync(packed, { maxOutputLength: limits.maxEntryBytes })
      } catch (error) {
        // Over the size limit: leave this one out. Anything else means the data is broken.
        if ((error as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") continue
        throw new Error("This zip is damaged")
      }
    }
    total += data.length
    if (total > limits.maxTotalBytes) throw new Error("This zip unpacks to more than this app accepts")
    out.push({ name, data })
  }
  return out
}
