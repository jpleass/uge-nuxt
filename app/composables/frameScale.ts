export const FRAME_SLICE = 86
export const FRAME_MIN_BORDER_WIDTH = 34
export const FRAME_MAX_BORDER_WIDTH = 80
export const FRAME_MIN_VIEWPORT = 320
export const FRAME_MAX_VIEWPORT = 1920

// Multiplier from a sub-CSS-pixel "world pixel" up to a visible retro block. Shared
// by the firework bursts and the cursor cell so they render at the same size.
export const CELL_SCALE = 7

// The same linear viewport → border-width mapping as `useFrameScale().borderWidth`,
// expressed in CSS so the frame's layout is correct on SSR / first paint without
// waiting for JS to measure the window.
export const FRAME_BORDER_WIDTH_CSS = `clamp(${FRAME_MIN_BORDER_WIDTH}px, calc(${FRAME_MIN_BORDER_WIDTH}px + (100vw - ${FRAME_MIN_VIEWPORT}px) * ${
  (FRAME_MAX_BORDER_WIDTH - FRAME_MIN_BORDER_WIDTH) /
  (FRAME_MAX_VIEWPORT - FRAME_MIN_VIEWPORT)
}), ${FRAME_MAX_BORDER_WIDTH}px)`

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function useFrameScale() {
  const { width: windowWidth } = useWindowSize()

  const borderWidth = computed(() => {
    const t = clamp01(
      (windowWidth.value - FRAME_MIN_VIEWPORT) /
        (FRAME_MAX_VIEWPORT - FRAME_MIN_VIEWPORT),
    )

    return Math.round(
      FRAME_MIN_BORDER_WIDTH +
        t * (FRAME_MAX_BORDER_WIDTH - FRAME_MIN_BORDER_WIDTH),
    )
  })

  // Derived world-pixel size from the frame's mask-slice geometry.
  const pixelSize = computed(() => borderWidth.value / FRAME_SLICE)

  // Visible retro block size (world pixel scaled up).
  const cellSize = computed(() => pixelSize.value * CELL_SCALE)

  return {
    borderWidth,
    pixelSize,
    cellSize,
  }
}
