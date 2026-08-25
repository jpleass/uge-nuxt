/**
 * A minimal, dependency-free 1-bit BMP writer.
 *
 * The only consumer is the frame exporter on /life, whose boards are literally
 * one bit per pixel — so a monochrome BMP stores them exactly, with no encoder
 * round-trip through a canvas and no colour space to get wrong. A 136×180
 * frame lands at ~3.6KB.
 *
 * Layout: BITMAPFILEHEADER, BITMAPINFOHEADER, a two-entry palette, then the
 * pixel rows. All fields little-endian.
 */

const FILE_HEADER_SIZE = 14
const INFO_HEADER_SIZE = 40
// Two BGRA palette entries: index 0 white, index 1 black.
const PALETTE_SIZE = 8
const PIXEL_OFFSET = FILE_HEADER_SIZE + INFO_HEADER_SIZE + PALETTE_SIZE

/** BMP rows are padded out to a 4-byte boundary. */
function rowSize(width: number): number {
  return Math.floor((width + 31) / 32) * 4
}

/**
 * Encode a board of 0/1 bytes as a monochrome BMP. Any non-zero cell is drawn
 * black on a white ground, matching how the preview paints.
 *
 * `board` is read row-major from the top left; BMP stores its rows bottom-up,
 * which is what the row flip below is for.
 */
export function encodeBmp(
  board: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const stride = rowSize(width)
  const pixelSize = stride * height
  const out = new Uint8Array(PIXEL_OFFSET + pixelSize)
  const view = new DataView(out.buffer)

  // BITMAPFILEHEADER
  out[0] = 0x42 // 'B'
  out[1] = 0x4d // 'M'
  view.setUint32(2, out.length, true) // file size
  view.setUint32(6, 0, true) // two reserved 16-bit fields
  view.setUint32(10, PIXEL_OFFSET, true)

  // BITMAPINFOHEADER
  view.setUint32(14, INFO_HEADER_SIZE, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // positive: rows stored bottom-up
  view.setUint16(26, 1, true) // colour planes
  view.setUint16(28, 1, true) // bits per pixel
  view.setUint32(30, 0, true) // compression: BI_RGB (none)
  view.setUint32(34, pixelSize, true)
  view.setInt32(38, 2835, true) // ~72 DPI, horizontal
  view.setInt32(42, 2835, true) // ~72 DPI, vertical
  view.setUint32(46, 2, true) // palette entries used
  view.setUint32(50, 2, true) // palette entries that matter

  // Palette, BGRA. Index 0 stays black-free: white, then black.
  out[54] = 0xff
  out[55] = 0xff
  out[56] = 0xff
  out[60] = 0x00
  out[61] = 0x00
  out[62] = 0x00

  // Pixels, MSB first: bit 7 of each byte is the leftmost of its eight cells.
  for (let y = 0; y < height; y++) {
    const rowStart = PIXEL_OFFSET + (height - 1 - y) * stride
    const src = y * width
    for (let x = 0; x < width; x++) {
      if (!board[src + x]) continue
      out[rowStart + (x >> 3)]! |= 0x80 >> (x & 7)
    }
  }

  return out
}
