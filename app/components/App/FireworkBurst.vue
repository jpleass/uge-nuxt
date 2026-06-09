<script lang="ts" setup>
// A single "game of life" firework: a small canvas seeded with a dense blob at
// the click point that churns outward via Conway B3/S23. It does not fade out —
// it runs until the board empties or hits the step cap, then stops the RAF and
// leaves its final frame painted on screen until the parent pops it to stay under
// the instance ceiling. Runs on a fixed ~15fps clock.
//
// `x`/`y` are *page* coordinates (incl. scroll); the canvas is teleported to
// <body> and positioned `absolute` so it stays pinned to the document, not the
// viewport, when the page scrolls.

const props = defineProps<{ x: number; y: number }>()

const GRID = 32 // board is GRID×GRID cells
const STEP_MS = 1000 / 15 // fixed simulation step (retro choppiness)
// Game of Life often settles into still lifes/oscillators that never empty, so
// `isEmpty()` alone could spin the RAF forever. Cap the run at a fixed number of
// steps (~13s at 15fps) as a hard backstop.
const MAX_STEPS = 60
const SEED_RADIUS: [number, number] = [3, 6] // cell range from center to seed
const SEED_DENSITY = 0.35 // fraction of seeded cells that start alive
// Each cell renders as a chunky retro block sized off the frame's pixel scale.
// `pixelSize` is a sub-CSS-pixel "world pixel" (~0.4–0.9px), so we scale it up to
// a visible block while still tracking the frame responsively.
const CELL_SCALE = 7

const { pixelSize } = useFrameScale()
const { globalColor } = useGlobalColor()

const canvas = ref<HTMLCanvasElement | null>(null)

// CSS size tracks the frame's pixel scale reactively, so a mid-animation resize
// grows/shrinks the burst around its centre (left/top recompute off cssSize, so
// the centre stays pinned to the same page coordinate). The canvas keeps its
// fixed GRID×GRID resolution; `image-rendering: pixelated` does the upscaling.
const cell = computed(() => pixelSize.value * CELL_SCALE)
const cssSize = computed(() => GRID * cell.value)

const style = computed(() => ({
  left: `${props.x - cssSize.value / 2}px`,
  top: `${props.y - cssSize.value / 2}px`,
  width: `${cssSize.value}px`,
  height: `${cssSize.value}px`,
}))

let cells = new Uint8Array(GRID * GRID)
let scratch = new Uint8Array(GRID * GRID)
let step = 0
let rafId: number | null = null
let accumulator = 0
let last = 0

const idx = (x: number, y: number) => y * GRID + x

function seed() {
  const randomSeedRadius =
    SEED_RADIUS[0] + Math.random() * (SEED_RADIUS[1] - SEED_RADIUS[0])
  const c = (GRID - 1) / 2
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dx = x - c
      const dy = y - c
      if (dx * dx + dy * dy <= randomSeedRadius * randomSeedRadius) {
        cells[idx(x, y)] = Math.random() < SEED_DENSITY ? 1 : 0
      }
    }
  }
}

function liveNeighbours(x: number, y: number) {
  let n = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && cells[idx(nx, ny)]) {
        n++
      }
    }
  }
  return n
}

function tickStep() {
  // Conway B3/S23 into the scratch buffer, then swap.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const n = liveNeighbours(x, y)
      const alive = cells[idx(x, y)]
      scratch[idx(x, y)] = (alive ? n === 2 || n === 3 : n === 3) ? 1 : 0
    }
  }
  ;[cells, scratch] = [scratch, cells]

  step++
}

function isEmpty() {
  for (let i = 0; i < cells.length; i++) if (cells[i]) return false
  return true
}

function render() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, GRID, GRID)

  const [r, g, b] = parseColor(globalColor.value)
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (cells[idx(x, y)]) ctx.fillRect(x, y, 1, 1)
    }
  }
}

function loop(now: number) {
  accumulator += now - last
  last = now

  let stepped = false
  while (accumulator >= STEP_MS) {
    accumulator -= STEP_MS
    tickStep()
    stepped = true
  }
  if (stepped) render()

  if (isEmpty() || step >= MAX_STEPS) {
    // Stop the loop but leave the final frame painted; the parent removes us
    // later when the instance ceiling is hit.
    rafId = null
    return
  }
  rafId = requestAnimationFrame(loop)
}

// The canvas bakes globalColor into its pixels at paint time. While the RAF runs
// it repaints every step, but once it stops (board empty or step cap) the final
// frame is frozen — so a later colour change would be ignored. Repaint on change
// to keep the static frame in sync.
watch(globalColor, () => render())

onMounted(() => {
  seed()
  render()
  last = performance.now()
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<template>
  <canvas
    ref="canvas"
    class="firework-burst"
    :width="GRID"
    :height="GRID"
    :style="style"
  />
</template>

<style scoped>
.firework-burst {
  position: absolute;
  z-index: 60;
  pointer-events: none;
  image-rendering: pixelated;
}
</style>
