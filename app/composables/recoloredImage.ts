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
  size: number,
) {
  const src = ref(source)

  // Cached pixels of the original asset, read once so retinting doesn't re-decode.
  let srcPixels: Uint8ClampedArray | null = null

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

  // Build a tinted data-URL from the cached source pixels: dark line -> `color`,
  // white field -> transparent.
  function recolor() {
    if (!srcPixels) return
    const [r, g, b] = parseColor(toValue(color))
    const out = new ImageData(size, size)
    const dst = out.data
    for (let i = 0; i < srcPixels.length; i += 4) {
      if (srcPixels[i]! < 128) {
        dst[i] = r
        dst[i + 1] = g
        dst[i + 2] = b
        dst[i + 3] = 255
      }
      // else: leave fully transparent (default zero-filled)
    }
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(out, 0, 0)
    src.value = canvas.toDataURL('image/png')
  }

  async function load() {
    const img = new Image()
    img.src = source
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, size, size)
    srcPixels = ctx.getImageData(0, 0, size, size).data
    recolor()
  }

  onMounted(load)
  watch(() => toValue(color), recolor)

  return { src }
}
