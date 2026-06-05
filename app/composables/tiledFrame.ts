import type { Ref } from 'vue'

/**
 * Sizes a tiling border frame to wrap its content. Height hugs the inner
 * content exactly; width snaps down to whole edge-tiles, leaving any sub-tile
 * slack to be centred by the element's `margin: 0 auto`.
 * The `border-image-repeat: round` rule scales the edge tiles to fit. Re-runs on
 * window resize and whenever the inner content changes size.
 */
export function useTiledFrame(
  frame: Ref<HTMLElement | null>,
  inner: Ref<HTMLElement | null>,
  borderWidth: number | (() => number),
  edgeTile: number | (() => number),
) {
  let frameId = 0

  const getBorderWidth =
    typeof borderWidth === 'function' ? borderWidth : () => borderWidth
  const getEdgeTile = typeof edgeTile === 'function' ? edgeTile : () => edgeTile

  // Becomes true after the first successful sizing pass, so callers can hide the
  // frame until it's been measured rather than flashing an unsized border.
  const ready = ref(false)

  // Largest whole number of edge-tiles fitting `available` px of edge length.
  const tilesFor = (available: number) =>
    Math.max(1, Math.floor((available - 2 * getBorderWidth()) / getEdgeTile()))

  function update() {
    const frameEl = frame.value
    const innerEl = inner.value
    if (!frameEl || !innerEl) return

    // Height hugs the content exactly; `border-image-repeat: round` rescales the
    // edge tiles to fit whatever height we land on, so no tile snapping is needed.
    frameEl.style.minHeight = `${innerEl.scrollHeight + 2 * getBorderWidth()}px`

    // Width fills the viewport; sub-tile slack is centred by margin auto.
    frameEl.style.width = `${tilesFor(window.innerWidth) * getEdgeTile() + 2 * getBorderWidth()}px`

    ready.value = true
  }

  function scheduleUpdate() {
    cancelAnimationFrame(frameId)
    frameId = requestAnimationFrame(update)
  }

  onMounted(update)
  useEventListener(window, 'resize', scheduleUpdate)
  useResizeObserver(inner, scheduleUpdate)
  onBeforeUnmount(() => cancelAnimationFrame(frameId))

  return { ready, update, scheduleUpdate }
}
