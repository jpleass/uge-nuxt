import type { MaybeRefOrGetter } from 'vue'

/**
 * Recolours a black-on-opaque-white source image on the client and exposes it
 * as a reactive data-URL: dark pixels become `color`, white pixels become
 * transparent. The source is decoded once and cached, so colour changes only
 * re-tint the cached pixels rather than re-decoding. `src` starts as the raw
 * asset so SSR/first paint still shows something; it's replaced once the asset
 * has loaded.
 */
export function useRecoloredImage(
  source: string,
  color: MaybeRefOrGetter<string>,
  width?: number,
  height?: number,
) {
  const src = ref(source)

  // Cached pixels of the original asset, read once so retinting doesn't re-decode.
  let srcPixels: Uint8ClampedArray | null = null
  // Resolved dimensions, set once the asset has decoded (see `load`).
  let w = width ?? 0
  let h = height ?? width ?? 0

  const TRANSITION_MS = 300

  // Resolve any CSS color string to [r, g, b] by letting the canvas parse it.
  function parseColor(value: string): [number, number, number] {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const ctx = c.getContext('2d')!
    ctx.fillStyle = value
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0]!, d[1]!, d[2]!]
  }

  // Build a tinted data-URL from the cached source pixels using an explicit rgb triple.
  function recolor(r: number, g: number, b: number) {
    if (!import.meta.client || !srcPixels) return
    const out = new ImageData(w, h)
    const dst = out.data
    for (let i = 0; i < srcPixels.length; i += 4) {
      // Treat a pixel as "line" only if it's opaque and dark. Transparent pixels
      // are stored as black (r=0), so without the alpha check they'd tint too.
      if (srcPixels[i + 3]! >= 128 && srcPixels[i]! < 128) {
        dst[i] = r
        dst[i + 1] = g
        dst[i + 2] = b
        dst[i + 3] = 255
      }
      // else: leave fully transparent (default zero-filled)
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(out, 0, 0)
    src.value = canvas.toDataURL('image/png')
  }

  let currentRgb: [number, number, number] = [0, 0, 0]
  let rafId: number | null = null

  function animateTo(target: string) {
    if (!srcPixels) return
    const from: [number, number, number] = [...currentRgb]
    const to = parseColor(target)
    const start = performance.now()

    if (rafId !== null) cancelAnimationFrame(rafId)

    function tick(now: number) {
      const t = Math.min(1, (now - start) / TRANSITION_MS)
      const r = Math.round(from[0] + (to[0] - from[0]) * t)
      const g = Math.round(from[1] + (to[1] - from[1]) * t)
      const b = Math.round(from[2] + (to[2] - from[2]) * t)
      recolor(r, g, b)
      if (t < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        currentRgb = to
        rafId = null
      }
    }

    rafId = requestAnimationFrame(tick)
  }

  async function load() {
    const img = new Image()
    img.src = source
    await img.decode()
    // Fall back to the asset's natural size when dimensions aren't supplied.
    w = width ?? img.naturalWidth
    h = height ?? width ?? img.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)
    srcPixels = ctx.getImageData(0, 0, w, h).data
    currentRgb = parseColor(toValue(color))
    recolor(...currentRgb)
  }

  if (import.meta.client) {
    onMounted(load)
    watch(() => toValue(color), animateTo)
  }

  return { src }
}
