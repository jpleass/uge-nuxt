import type { Ref } from 'vue'

/**
 * Sizes a tiling border frame to fill the window. Height fills the viewport
 * exactly and grows past it (snapped to whole edge-tiles) to fit taller content;
 * width snaps down to whole edge-tiles, leaving any sub-tile slack to be centred
 * by the element's `margin: 0 auto`. The `border-image-repeat: round` rule
 * scales the edge tiles to fit. Re-runs on window resize and whenever the inner
 * content changes size.
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

    // Height fills the viewport exactly, growing to whole tiles for taller content.
    // The frame's offset from the document top is the space its container reserves
    // above it (e.g. body padding); assume the same below, so subtract it twice to
    // avoid overflowing the viewport.
    const vInset = frameEl.getBoundingClientRect().top + window.scrollY
    const contentHeight =
      Math.ceil(innerEl.scrollHeight / getEdgeTile()) * getEdgeTile() +
      2 * getBorderWidth()
    frameEl.style.minHeight = `${Math.max(window.innerHeight - 2 * vInset, contentHeight)}px`

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
