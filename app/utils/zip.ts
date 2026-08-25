/**
 * A minimal, dependency-free ZIP writer.
 *
 * Only the "store" method (no compression) is implemented. That is deliberate:
 * the only consumer is the frame exporter on /life, whose 1-bit BMP frames run
 * a few KB each, so even a long run lands well under a megabyte. Compressing
 * them would shrink that a lot in relative terms and not at all in terms that
 * matter, while forcing a compression library into a project that otherwise
 * ships next to no runtime dependencies.
 *
 * No directory entries, no ZIP64, no unicode filenames: keep names ASCII and
 * archives under 4GB.
 */

let crcTable: Uint32Array | null = null

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  crcTable = table
  return table
}

/** CRC-32 (IEEE 802.3), as required by the ZIP local/central file headers. */
export function crc32(bytes: Uint8Array): number {
  const table = getCrcTable()
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = table[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipFile {
  name: string
  data: Uint8Array
}

const LOCAL_HEADER_SIZE = 30
const CENTRAL_HEADER_SIZE = 46
const EOCD_SIZE = 22
// DOS timestamp for 1980-01-01 00:00 — the epoch of the format. Real mtimes
// aren't meaningful for generated frames, and a zero date upsets some tools.
const DOS_TIME = 0
const DOS_DATE = (0 << 9) | (1 << 5) | 1

/**
 * Build an uncompressed ZIP archive from a list of files, in the order given.
 * Layout: [local header + data] per file, then the central directory, then the
 * end-of-central-directory record. All fields little-endian.
 */
export function createZip(files: ZipFile[]): Blob {
  const encoder = new TextEncoder()
  const entries = files.map((file) => ({
    name: encoder.encode(file.name),
    data: file.data,
    crc: crc32(file.data),
    offset: 0,
  }))

  const localSize = entries.reduce(
    (sum, e) => sum + LOCAL_HEADER_SIZE + e.name.length + e.data.length,
    0,
  )
  const centralSize = entries.reduce(
    (sum, e) => sum + CENTRAL_HEADER_SIZE + e.name.length,
    0,
  )

  const out = new Uint8Array(localSize + centralSize + EOCD_SIZE)
  const view = new DataView(out.buffer)
  let pos = 0

  for (const entry of entries) {
    entry.offset = pos

    view.setUint32(pos, 0x04034b50, true) // local file header signature
    view.setUint16(pos + 4, 20, true) // version needed to extract (2.0)
    view.setUint16(pos + 6, 0, true) // general purpose flags
    view.setUint16(pos + 8, 0, true) // compression method: stored
    view.setUint16(pos + 10, DOS_TIME, true)
    view.setUint16(pos + 12, DOS_DATE, true)
    view.setUint32(pos + 14, entry.crc, true)
    view.setUint32(pos + 18, entry.data.length, true) // compressed size
    view.setUint32(pos + 22, entry.data.length, true) // uncompressed size
    view.setUint16(pos + 26, entry.name.length, true)
    view.setUint16(pos + 28, 0, true) // extra field length
    pos += LOCAL_HEADER_SIZE

    out.set(entry.name, pos)
    pos += entry.name.length
    out.set(entry.data, pos)
    pos += entry.data.length
  }

  const centralOffset = pos

  for (const entry of entries) {
    view.setUint32(pos, 0x02014b50, true) // central directory header signature
    view.setUint16(pos + 4, 20, true) // version made by
    view.setUint16(pos + 6, 20, true) // version needed to extract
    view.setUint16(pos + 8, 0, true) // general purpose flags
    view.setUint16(pos + 10, 0, true) // compression method: stored
    view.setUint16(pos + 12, DOS_TIME, true)
    view.setUint16(pos + 14, DOS_DATE, true)
    view.setUint32(pos + 16, entry.crc, true)
    view.setUint32(pos + 20, entry.data.length, true) // compressed size
    view.setUint32(pos + 24, entry.data.length, true) // uncompressed size
    view.setUint16(pos + 28, entry.name.length, true)
    view.setUint16(pos + 30, 0, true) // extra field length
    view.setUint16(pos + 32, 0, true) // file comment length
    view.setUint16(pos + 34, 0, true) // disk number start
    view.setUint16(pos + 36, 0, true) // internal file attributes
    view.setUint32(pos + 38, 0, true) // external file attributes
    view.setUint32(pos + 42, entry.offset, true) // local header offset
    pos += CENTRAL_HEADER_SIZE

    out.set(entry.name, pos)
    pos += entry.name.length
  }

  view.setUint32(pos, 0x06054b50, true) // end of central directory signature
  view.setUint16(pos + 4, 0, true) // number of this disk
  view.setUint16(pos + 6, 0, true) // disk with the central directory
  view.setUint16(pos + 8, entries.length, true) // entries on this disk
  view.setUint16(pos + 10, entries.length, true) // total entries
  view.setUint32(pos + 12, centralSize, true)
  view.setUint32(pos + 16, centralOffset, true)
  view.setUint16(pos + 20, 0, true) // archive comment length

  return new Blob([out], { type: 'application/zip' })
}
