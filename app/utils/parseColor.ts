/**
 * Resolve any CSS color string (hex, rgb(), named, etc.) to an `[r, g, b]`
 * triple by letting a 1×1 canvas parse it via `fillStyle`. Client-only —
 * returns `[0, 0, 0]` if no canvas context is available.
 */
export function parseColor(value: string): [number, number, number] {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const ctx = c.getContext('2d')
  if (!ctx) return [0, 0, 0]
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0]!, d[1]!, d[2]!]
}

/** Format an `[r, g, b]` triple as a `#rrggbb` hex string. */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}
