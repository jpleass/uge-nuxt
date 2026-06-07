/** Shared duration/easing for the global color transition. Every consumer reads
 *  the live `globalColor`, so this is the single source of truth for timing. */
export const COLOR_TRANSITION_MS = 300
export const colorEasing = (t: number) => 1 - (1 - t) ** 2 // ease-out (quad)

// Module-scoped singleton animation state (client-only). A single RAF loop is
// shared across every `useGlobalColor()` caller so they all move on one clock.
let currentRgb: [number, number, number] = [0x33, 0x33, 0x33]
let fromRgb: [number, number, number] = [...currentRgb]
let targetRgb: [number, number, number] = [...currentRgb]
let startTime = 0
let rafId: number | null = null

export const useGlobalColor = () => {
  // Live, interpolated color. SSR-safe initial matches `--color-global`.
  const globalColor = useState<string>('globalColor', () => '#333333')

  const writeFrame = (rgb: [number, number, number]) => {
    currentRgb = rgb
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2])
    globalColor.value = hex
    document.documentElement.style.setProperty('--color-global', hex)
  }

  const tick = (now: number) => {
    const t = Math.min(1, (now - startTime) / COLOR_TRANSITION_MS)
    const e = colorEasing(t)
    writeFrame([
      Math.round(fromRgb[0] + (targetRgb[0] - fromRgb[0]) * e),
      Math.round(fromRgb[1] + (targetRgb[1] - fromRgb[1]) * e),
      Math.round(fromRgb[2] + (targetRgb[2] - fromRgb[2]) * e),
    ])
    if (t < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      writeFrame(targetRgb)
      rafId = null
    }
  }

  // Animate the global color toward `color` over the shared duration/easing.
  // Restarting mid-transition lerps from the live value, so rapid retargets
  // stay smooth.
  const setGlobalColor = (color: string) => {
    if (!import.meta.client) return
    targetRgb = parseColor(color)
    fromRgb = [...currentRgb]
    startTime = performance.now()
    if (rafId === null) rafId = requestAnimationFrame(tick)
  }

  return {
    globalColor,
    setGlobalColor,
  }
}

export const useGlobalColorObserver = () => {
  const { setGlobalColor } = useGlobalColor()

  onMounted(() => {
    const observed = new WeakSet<Element>()

    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const color = (entry.target as HTMLElement).dataset.color
            if (color) setGlobalColor(color)
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )

    const observeAll = () => {
      document.querySelectorAll<HTMLElement>('[data-color]').forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el)
          intersection.observe(el)
        }
      })
    }

    observeAll()

    const mutation = new MutationObserver(observeAll)
    mutation.observe(document.body, { childList: true, subtree: true })

    onUnmounted(() => {
      intersection.disconnect()
      mutation.disconnect()
    })
  })
}
